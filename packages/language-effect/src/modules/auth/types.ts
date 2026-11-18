// Identity, for the handlers that deal in it: signing up, signing in, issuing API keys. The host provides it (Better
// Auth on D1 for Cloudflare); a handler never imports the auth library itself.
import { Context, Data, type Effect } from "effect";

/** Auth said no: the email is `taken`, or the email and password don't match (`credentials`). */
export class AuthRefused extends Data.TaggedError("AuthRefused")<{ readonly reason: "credentials" | "taken" }> {}

export class Auth extends Context.Service<Auth, {
  /** A new person, signed up with an email and a password. Their id is a `per_` id. */
  readonly signUp: (input: { readonly email: string; readonly password: string; readonly name: string }) => Effect.Effect<{ readonly person: string }, AuthRefused>;
  /** A new session for the person with this email and password: its `ses_` id and the bearer token for later calls. */
  readonly signIn: (input: { readonly email: string; readonly password: string }) => Effect.Effect<{ readonly session: string; readonly token: string }, AuthRefused>;
  /** A new API key that calls on `person`'s behalf: its `key_` id, and the key itself, which is never readable again. */
  readonly createApiKey: (input: { readonly person: string; readonly name: string }) => Effect.Effect<{ readonly apiKey: string; readonly key: string }>;
}>()("@orthograph/language-effect/Auth") {}
