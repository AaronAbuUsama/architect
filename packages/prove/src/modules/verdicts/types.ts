// Verdicts as the logbook takes them: a signed token from an OIDC issuer, and one POST per operation (D3 #8, #31).
import { Data, type Effect, type Redacted } from "effect";

export class VerdictsFailed extends Data.TaggedError("VerdictsFailed")<{ readonly message: string }> {}

/** Where the token that signs a verdict comes from. */
export type TokenSource =
  /** An OIDC server that mints a token for a client (the local issuer, `ci-main`): client credentials. */
  | { readonly kind: "issuer"; readonly issuer: string; readonly client: string }
  /** The CI job's own token: GitHub Actions' request URL and the bearer that asks for it (`id-token: write`). */
  | { readonly kind: "github"; readonly requestUrl: string; readonly requestToken: Redacted.Redacted<string> };

export interface Result {
  readonly operation: string;
  readonly verdict: "pass" | "fail";
}

export interface VerdictsApi {
  /** A token for audience `architect-logbook`. Redacted: it is never printed, logged or put in an error. */
  readonly mint: (source: TokenSource) => Effect.Effect<Redacted.Redacted<string>, VerdictsFailed>;
  /** One `POST <logbook>/verdicts` per result, in order; the first the logbook refuses stops it. */
  readonly post: (options: {
    readonly logbook: string;
    readonly token: Redacted.Redacted<string>;
    readonly revision: string;
    readonly environment: string;
    readonly results: ReadonlyArray<Result>;
  }) => Effect.Effect<void, VerdictsFailed>;
}
