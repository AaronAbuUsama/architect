// Who may write to the logbook: an OIDC token from the one issuer this logbook names (D3 #8).
import { Data, type Effect } from "effect";
import type { JWTVerifyGetKey } from "jose";

/** What the logbook trusts. Every field is an environment variable of the worker; none is a secret. */
export interface TokenPolicy {
  readonly issuer: string;
  readonly audience: string;
  /** `<owner>/<repo>`: the only repository whose jobs may write. */
  readonly repository: string;
  /** Allow-list of refs. `*` stands for one path segment, never a prefix: `refs/pull/<star>/merge`, not `refs/pull/`. */
  readonly refs: ReadonlyArray<string>;
  /** Workflow names; an entry with a `/` is a workflow file path (`.github/workflows/ci.yml`) matched on `job_workflow_ref`. */
  readonly workflows: ReadonlyArray<string>;
}

/** The claims of a verified token that the logbook keeps with what it stores. Never the token itself. */
export interface Claims {
  readonly repository: string;
  readonly ref: string;
  readonly workflow: string;
  readonly eventName: string | null;
  readonly sha: string | null;
  readonly jobWorkflowRef: string | null;
}

/** A token the logbook will not take. `reason` is jose's error code or the name of the policy check; it is not the token. */
export class TokenRefused extends Data.TaggedError("TokenRefused")<{ readonly reason: string }> {}

/** The worker's variables are missing or empty: named here, so the operator can fix them. */
export class Misconfigured extends Data.TaggedError("Misconfigured")<{ readonly missing: ReadonlyArray<string> }> {}

export interface TokensApi {
  /** The `Authorization` header's value, verified: RS256 only, issuer, audience, expiry, then the policy. */
  readonly verify: (authorization: string | null) => Effect.Effect<Claims, TokenRefused>;
}

/** Where the issuer's keys come from: jose's remote key set in the worker, a local key set in a test. */
export type KeyLookup = JWTVerifyGetKey;

export type PolicyVars = Readonly<Record<string, unknown>>;

export interface TokensFactory {
  readonly make: (policy: TokenPolicy, keys: KeyLookup) => TokensApi;
  /** Keys fetched from the issuer's JWKS URL (cached by jose, refetched on an unknown key id). */
  readonly remote: (policy: TokenPolicy, jwksUrl: string) => TokensApi;
  /** `OIDC_ISSUER`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`, `ALLOWED_REPOSITORY`, `ALLOWED_REFS`, `ALLOWED_WORKFLOWS`. */
  readonly fromVars: (vars: PolicyVars) => Effect.Effect<{ readonly policy: TokenPolicy; readonly jwksUrl: string }, Misconfigured>;
}
