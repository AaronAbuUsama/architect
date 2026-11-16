// The logbook's HTTP surface. The worker's `fetch` calls `handle` and nothing else.
import { Data, type Effect } from "effect";
import type { Book } from "#modules/book/service.js";
import type { Misconfigured, TokensApi } from "#modules/tokens/types.js";

/** The worker's bindings and variables (`wrangler.jsonc`; the variables are the token policy). */
export interface LogbookEnv {
  readonly BOOK: DurableObjectNamespace<Book>;
  /** R2: one object per revision, `models/<revision>.json`. */
  readonly MODELS: R2Bucket;
  readonly OIDC_ISSUER: string;
  readonly OIDC_JWKS_URL: string;
  readonly OIDC_AUDIENCE: string;
  readonly ALLOWED_REPOSITORY: string;
  readonly ALLOWED_REFS: string;
  readonly ALLOWED_WORKFLOWS: string;
}

export class BadRequest extends Data.TaggedError("BadRequest")<{ readonly reason: string }> {}
export class Conflict extends Data.TaggedError("Conflict")<{ readonly reason: string }> {}
export class NotFound extends Data.TaggedError("NotFound")<{ readonly what: string }> {}
/** The Durable Object or R2 didn't answer: a 500, with the failing part named but no detail. */
export class Unavailable extends Data.TaggedError("Unavailable")<{ readonly part: "book" | "models" }> {}

/**
 * Routes. Writes (`POST /verdicts`, `PUT /models/<revision>`, `POST /releases`) need a bearer token the policy accepts
 * (401 otherwise, and nothing is stored); reads are open.
 *
 * - `GET /health`
 * - `POST /verdicts` `{revision, environment, operation, verdict: "pass"|"fail"}`; `GET /verdicts?revision=&environment=&operation=&ref=`
 *   answers an array, oldest first; `GET /verdicts/latest?...` the newest verdict of each operation in each environment.
 * - `PUT /models/<revision>` any JSON object, kept in R2 and never changed (409 for a different one); `GET /models/<revision>`.
 * - `POST /releases` `{version, revision}` (the revision's model must be there, a version is released once);
 *   `GET /releases/latest` the last production release, 404 when there is none.
 */
export interface HttpApi {
  readonly handle: (request: Request, env: LogbookEnv, tokens: Effect.Effect<TokensApi, Misconfigured>) => Effect.Effect<Response>;
}
