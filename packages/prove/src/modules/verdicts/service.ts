import { Effect, Redacted, Schema } from "effect";
import { VerdictsFailed, type Held, type TokenSource, type VerdictsApi } from "./types.ts";

const AUDIENCE = "architect-logbook";

const failed = (message: string) => new VerdictsFailed({ message });

/** The JSON body of a response, whatever shape the other side gave it. */
const jsonOf = (response: Response) => Effect.tryPromise({ try: () => response.json() as Promise<Record<string, unknown>>, catch: () => failed(`answered ${response.status} with no JSON`) });

const request = (what: string, url: string, init: RequestInit) =>
  Effect.tryPromise({ try: () => fetch(url, init), catch: () => failed(`${what}: couldn't reach ${new URL(url).origin}`) });

const fromIssuer = (issuer: string, client: string) =>
  Effect.gen(function* () {
    const response = yield* request("the issuer", `${issuer}/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: client, client_secret: "unused" }),
    });
    if (!response.ok) return yield* failed(`the issuer refused a token for client ${client} (${response.status})`);
    const body = yield* jsonOf(response);
    return typeof body["access_token"] === "string" ? body["access_token"] : yield* failed("the issuer's answer has no access_token");
  });

const fromGithub = (requestUrl: string, requestToken: Redacted.Redacted<string>) =>
  Effect.gen(function* () {
    const url = new URL(requestUrl);
    url.searchParams.set("audience", AUDIENCE);
    const response = yield* request("GitHub's token endpoint", url.toString(), { headers: { authorization: `Bearer ${Redacted.value(requestToken)}` } });
    if (!response.ok) return yield* failed(`GitHub refused a token (${response.status}); does the job have id-token: write?`);
    const body = yield* jsonOf(response);
    return typeof body["value"] === "string" ? body["value"] : yield* failed("GitHub's answer has no value");
  });

const Rows = Schema.Array(Schema.Struct({ revision: Schema.String, environment: Schema.String, operation: Schema.String, verdict: Schema.String, ref: Schema.String, sha256: Schema.optionalKey(Schema.NullOr(Schema.String)) }));

const minted = (source: TokenSource) =>
  source.kind === "given" ? Effect.succeed(Redacted.value(source.token))
  : source.kind === "issuer" ? fromIssuer(source.issuer, source.client)
  : fromGithub(source.requestUrl, source.requestToken);

export const Verdicts: VerdictsApi = {
  sourceOf: (env) => {
    const [given, issuer, requestUrl, requestToken] = [env["ARCHITECT_LOGBOOK_TOKEN"], env["ARCHITECT_OIDC_ISSUER"], env["ACTIONS_ID_TOKEN_REQUEST_URL"], env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]];
    if (given) return Effect.succeed({ kind: "given", token: Redacted.make(given) });
    if (issuer) return Effect.succeed({ kind: "issuer", issuer, client: env["ARCHITECT_OIDC_CLIENT"] || "ci-main" });
    if (requestUrl && requestToken) return Effect.succeed({ kind: "github", requestUrl, requestToken: Redacted.make(requestToken) });
    return Effect.fail(failed("no way to sign a write to the logbook: set ARCHITECT_OIDC_ISSUER (and ARCHITECT_OIDC_CLIENT), or ARCHITECT_LOGBOOK_TOKEN, or run in a GitHub Actions job with id-token: write"));
  },
  mint: (source: TokenSource) => minted(source).pipe(Effect.map(Redacted.make)),
  latest: ({ logbook, revision, environment, ref }) =>
    Effect.gen(function* () {
      const query = new URLSearchParams({ revision, environment, ref });
      const response = yield* request("the logbook", `${logbook}/verdicts/latest?${query}`, {});
      if (!response.ok) return yield* failed(`the logbook would not give ${environment}'s verdicts for ${revision} (${response.status})`);
      const body = yield* Effect.tryPromise({ try: () => response.json() as Promise<unknown>, catch: () => failed("the logbook's verdicts were not JSON") });
      return (yield* Schema.decodeUnknownEffect(Rows)(body).pipe(Effect.mapError((e) => failed(`the logbook's verdicts were not as expected: ${e.message}`)))) as ReadonlyArray<Held>;
    }),
  post: ({ logbook, token, revision, environment, sha256, results }) =>
    Effect.forEach(results, (r) =>
      Effect.gen(function* () {
        const response = yield* request("the logbook", `${logbook}/verdicts`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${Redacted.value(token)}` },
          body: JSON.stringify({ revision, environment, operation: r.operation, verdict: r.verdict, ...(sha256 === undefined ? {} : { sha256 }) }),
        });
        if (!response.ok) return yield* failed(`the logbook refused ${r.operation} (${response.status})`);
      }), { discard: true }),
};
