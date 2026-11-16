// A local world: the generated Worker on real workerd, with its world Durable Object and a fresh local D1.
import { Data, type Effect, type Scope } from "effect";

export class WorldFailed extends Data.TaggedError("WorldFailed")<{ readonly message: string }> {}

export interface Running {
  readonly url: string;
  /** Where wrangler's own output goes, for when something looks wrong. */
  readonly log: string;
}

export interface WorldsApi {
  /**
   * Start the project at `root`: a fresh local database with the model's tables, then `wrangler dev` with a new
   * world secret (never written to a file). Ready once the world answers. Stopped when the scope closes.
   */
  readonly start: (options: {
    readonly root: string;
    readonly port: number;
    /** Which folder under `.architect/` holds this world's state: `dev` for `architect dev`, `prove` for prove. */
    readonly name: string;
    /** The collector's OTLP/HTTP base URL; unset, the Worker exports nothing. */
    readonly otlp?: string;
  }) => Effect.Effect<Running, WorldFailed, Scope.Scope>;
}
