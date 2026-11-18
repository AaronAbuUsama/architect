import { Effect, Layer } from "effect";
import { Auth, AuthRefused, Principals } from "@orthograph/language-effect";
import type { Principal } from "orthograph";
import type { AuthD1Api, AuthInstance, CastMember } from "./types.ts";
import { held, instance, statusOf, type BetterAuth } from "./internal/instance.ts";
import { KEY_PREFIX } from "./internal/options.ts";
import * as oauth from "./internal/oauth.ts";

const ANONYMOUS: Principal = { kind: "anonymous" };

/** Run a Better Auth call once its tables exist. A failure Better Auth didn't give a status is a defect. */
const call = <A>(a: AuthInstance, f: (auth: BetterAuth) => Promise<A>) =>
  Effect.tryPromise({ try: () => held(a).auth().then(f), catch: (e) => e });

const principalOf = (a: AuthInstance, authorization: string | undefined): Effect.Effect<Principal> => {
  const credential = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!credential) return Effect.succeed(ANONYMOUS);
  const headers = new Headers(credential.startsWith(KEY_PREFIX) ? { "x-api-key": credential } : { authorization: `Bearer ${credential}` });
  return call(a, (auth) => auth.api.getSession({ headers })).pipe(
    Effect.map((s): Principal => (s ? { kind: "person", person: s.user.id, email: s.user.email } : ANONYMOUS)),
    Effect.orElseSucceed(() => ANONYMOUS),
  );
};

const refused = (reason: "credentials" | "taken", status: number) => (e: unknown) =>
  statusOf(e) === status ? Effect.fail(new AuthRefused({ reason })) : Effect.die(e);

const layer: AuthD1Api["layer"] = (a) =>
  Layer.mergeAll(
    Layer.succeed(Principals, { of: (authorization) => principalOf(a, authorization) }),
    Layer.succeed(Auth, {
      signUp: (body) => call(a, (auth) => auth.api.signUpEmail({ body })).pipe(
        Effect.map((r) => ({ person: r.user.id })),
        Effect.catch(refused("taken", 422)),
      ),
      signIn: (body) => call(a, (auth) => auth.api.signInEmail({ body })).pipe(
        Effect.catch(refused("credentials", 401)),
        Effect.flatMap((r) => call(a, (auth) => auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${r.token}` }) })).pipe(
          Effect.orDie,
          Effect.flatMap((s) => (s ? Effect.succeed({ session: s.session.id, token: r.token }) : Effect.die(new Error("a new session didn't resolve")))),
        )),
      ),
      // With no request headers: the server's own call, on the person's behalf.
      createApiKey: ({ person, name }) => call(a, (auth) => auth.api.createApiKey({ body: { userId: person, name } })).pipe(
        Effect.map((r) => ({ apiKey: r.id, key: r.key })),
        Effect.orDie,
      ),
    }),
  );

// A registration is capped before Better Auth sees it (D3 #123); everything else is Better Auth's.
const handle: AuthD1Api["handle"] = (a, request) =>
  Effect.gen(function* () {
    // Better Auth's own tables must exist before the guard counts one.
    const refused = oauth.isRegistration(request) ? yield* Effect.tryPromise(() => held(a).auth()).pipe(Effect.andThen(oauth.registrationGuard(a))) : undefined;
    return refused ?? (yield* Effect.tryPromise(() => held(a).auth(originOf(request)).then((auth) => auth.handler(request))));
  }).pipe(Effect.orDie);

// OAuth's issuer and the MCP resource are the address a request was reached on: each is answered by the instance for its origin.
const originOf = (request: Request) => new URL(request.url).origin;
const oauthApi: AuthD1Api["oauth"] = {
  discovery: (a, request) => Effect.tryPromise(() => held(a).auth(originOf(request))).pipe(Effect.flatMap((auth) => oauth.discovery(auth, request)), Effect.orDie),
  bearer: (a, request) => Effect.tryPromise(() => held(a).auth(originOf(request))).pipe(Effect.flatMap((auth) => oauth.bearer(a, auth, request)), Effect.orDie),
  challenge: (request, error) => oauth.challenge(request, error),
};

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
const random = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => ALPHABET[b % 36]).join("");

const castMember: AuthD1Api["castMember"] = (a, name, anonymous, stored) =>
  Effect.gen(function* () {
    const member = stored ?? { email: `${name}.${random(8)}@world.test`, password: random(24) };
    if (anonymous) return { email: member.email, password: member.password };
    const person = member.person ?? (yield* call(a, (auth) => auth.api.signUpEmail({ body: { email: member.email, password: member.password, name } })).pipe(Effect.orDie)).user.id;
    const { token } = yield* call(a, (auth) => auth.api.signInEmail({ body: { email: member.email, password: member.password } })).pipe(Effect.orDie);
    return { person, token, email: member.email, password: member.password } satisfies CastMember;
  });

export const AuthD1: AuthD1Api = { make: instance, layer, handle, oauth: oauthApi, castMember };
