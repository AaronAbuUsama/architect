// `architect dev`: the generated Worker on real workerd, with its world and a fresh local D1.
import { Data, type Effect, type Scope } from "effect";

export class DevFailed extends Data.TaggedError("DevFailed")<{ readonly message: string }> {}

export interface Running {
  readonly url: string;
  /** Where wrangler's own output goes, for when something looks wrong. */
  readonly log: string;
}

export interface DevApi {
  /**
   * Start the project at `root`: a fresh local database with the model's tables, then `wrangler dev` with a new
   * world secret (never written to a file). Ready once the world answers. Stopped when the scope closes.
   */
  readonly start: (options: { readonly root: string; readonly port: number }) => Effect.Effect<Running, DevFailed, Scope.Scope>;
}
