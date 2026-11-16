// The OIDC token a write to the logbook carries (D3 #8). Never printed, never written to a file.
import { Effect } from "effect";
import { ReleaseFailed, type Env } from "../types.ts";
import { call, ok } from "./http.ts";

const AUDIENCE = "architect-logbook";

const tokenIn = (what: string, body: unknown, key: string): Effect.Effect<string, ReleaseFailed> => {
  const token = typeof body === "object" && body !== null ? (body as Record<string, unknown>)[key] : undefined;
  return typeof token === "string" ? Effect.succeed(token) : Effect.fail(new ReleaseFailed({ message: `${what} gave no token` }));
};

/** A ready token, else one the local issuer mints for a scenario (client credentials), else GitHub Actions' own. */
export const tokenOf = (env: Env): Effect.Effect<string, ReleaseFailed> => {
  const given = env["ARCHITECT_LOGBOOK_TOKEN"];
  if (given) return Effect.succeed(given);
  const issuer = env["ARCHITECT_OIDC_ISSUER"];
  if (issuer) {
    return Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(`${issuer}/token`, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ grant_type: "client_credentials", client_id: env["ARCHITECT_OIDC_CLIENT"] ?? "ci-main", client_secret: "unused" }),
          }).then((r) => r.json() as Promise<unknown>),
        catch: (e) => new ReleaseFailed({ message: `the issuer at ${issuer} did not answer: ${String(e)}` }),
      });
      return yield* tokenIn(`the issuer at ${issuer}`, response, "access_token");
    });
  }
  const request = env["ACTIONS_ID_TOKEN_REQUEST_URL"];
  const bearer = env["ACTIONS_ID_TOKEN_REQUEST_TOKEN"];
  if (request && bearer) {
    return call("GET", `${request}${request.includes("?") ? "&" : "?"}audience=${AUDIENCE}`, { token: bearer }).pipe(
      Effect.flatMap((a) => ok("a token", a)),
      Effect.flatMap((body) => tokenIn("GitHub Actions", body, "value")),
    );
  }
  return Effect.fail(new ReleaseFailed({ message: "nothing to sign a write to the logbook with: set ARCHITECT_LOGBOOK_TOKEN, or ARCHITECT_OIDC_ISSUER (and ARCHITECT_OIDC_CLIENT)" }));
};
