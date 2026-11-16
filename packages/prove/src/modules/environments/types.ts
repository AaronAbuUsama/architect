// A long-lived local environment: the revision's bundle on its own wrangler dev, with its own state, port and secrets.
import { Data, type Effect } from "effect";

export class EnvironmentFailed extends Data.TaggedError("EnvironmentFailed")<{ readonly message: string }> {}

export type Status =
  | { readonly state: "down"; readonly name: string }
  | {
      readonly state: "up";
      readonly name: string;
      readonly url: string;
      readonly port: number;
      readonly pid: number;
      readonly revision: string;
      readonly sha256: string;
    };

export type Up = Extract<Status, { state: "up" }>;

export interface EnvironmentsApi {
  /**
   * Start environment `name` on a revision's bundle, building the revision first when it has no artefact. Everything it
   * keeps is under `.architect/environments/<name>/`: its generated wrangler config, `secrets.env` (mode 0600), its
   * `state/`, `pid`, `port` and wrangler's log. An environment already running is left alone, unless a `revision` is
   * asked for that it isn't running: it is then restarted on that bundle with its state kept. `port` defaults to the one
   * it last had, then to any free port.
   */
  readonly up: (options: {
    readonly root: string;
    readonly name: string;
    readonly port?: number;
    /** Default: the project's current revision. */
    readonly revision?: string;
  }) => Effect.Effect<Up, EnvironmentFailed>;
  /** Stop it, and everything it started. An environment that isn't running is not an error. */
  readonly down: (options: { readonly root: string; readonly name: string }) => Effect.Effect<void, EnvironmentFailed>;
  readonly status: (options: { readonly root: string; readonly name: string }) => Effect.Effect<Status, EnvironmentFailed>;
}
