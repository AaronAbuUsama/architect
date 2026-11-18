// A local world: the generated Worker on real workerd, with its world Durable Object and a fresh local D1.
import { Data, type Effect, type Scope } from "effect";

export class WorldFailed extends Data.TaggedError("WorldFailed")<{
  readonly message: string;
  /** wrangler exited because a socket it picked was already taken: starting again can work. */
  readonly taken?: boolean;
}> {}

export interface Running {
  readonly url: string;
  /** Where wrangler's own output goes, for when something looks wrong. */
  readonly log: string;
}

/** A `wrangler dev` kept running by whoever asked for it: a long-lived environment. */
export interface Launched {
  readonly pid: number;
  readonly url: string;
  readonly log: string;
}

export interface WorldsApi {
  /**
   * Start `wrangler dev` on a config the caller made, detached in its own process group so it outlives this process:
   * the local database's migrations applied first, then wrangler on `port` with its own `state` folder and inspector
   * port, started again if a socket it picked was taken, and ready once `ready` (a path) answers. Stopping it is the
   * caller's: the pid is theirs to keep.
   */
  readonly launch: (options: {
    readonly config: string;
    readonly state: string;
    readonly port: number;
    readonly log: string;
    /** Written with wrangler's process id the moment it starts. */
    readonly pidFile: string;
    /** A file of secrets for wrangler's `--env-file`. */
    readonly envFile?: string;
    /** Secrets for the Worker that never touch a file or an argument (the telemetry sinks' tokens). */
    readonly secretEnv?: Readonly<Record<string, string>>;
    readonly ready: string;
  }) => Effect.Effect<Launched, WorldFailed>;

  /**
   * Start the project at `root`: a fresh local database with the model's tables, then `wrangler dev` with a new
   * world secret (never written to a file). Ready once the world answers. Stopped when the scope closes.
   */
  readonly start: (options: {
    readonly root: string;
    readonly port: number;
    /** Which folder under `.ortho/` holds this world's state: `dev` for `ortho dev`, `prove` for prove. */
    readonly name: string;
    /** The collector's OTLP/HTTP base URL; unset, the Worker exports nothing. */
    readonly otlp?: string;
    /** The environment this world stands for, written on every span as `deployment.environment`. Default `local`. */
    readonly environment?: string;
    /** Secrets for the Worker that never touch a file or an argument: `OTLP_SINKS`, from `Sinks.resolve`. */
    readonly secretEnv?: Readonly<Record<string, string>>;
  }) => Effect.Effect<Running, WorldFailed, Scope.Scope>;
}
