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
      /** The bundle it runs. The logbook is its own worker, built from source, and has none. */
      readonly revision?: string;
      readonly sha256?: string;
      /** Where its own collector writes, for an environment that hosts worlds. */
      readonly telemetry?: string;
    };

export type Up = Extract<Status, { state: "up" }>;

/** What the logbook trusts, from `ARCHITECT_OIDC_*` (D3 #33). `ref` may list several, as a comma-separated allow-list. */
export interface LogbookSetup {
  readonly issuer: string;
  readonly repository: string;
  readonly refs: ReadonlyArray<string>;
  readonly workflows: ReadonlyArray<string>;
}

export interface EnvironmentsApi {
  /**
   * Start environment `name` on a revision's bundle, building the revision first when it has no artefact. Everything it
   * keeps is under `.architect/environments/<name>/`: its generated wrangler config, `secrets.env` (mode 0600), its
   * `state/`, `pid`, `port` and wrangler's log. An environment already running is left alone, unless a `revision` is
   * asked for that it isn't running: it is then restarted on that bundle with its state kept. `port` defaults to the one
   * it last had, then to any free port. An environment whose blueprint declares a `lifetime` hosts worlds: it gets a
   * collector of its own (`telemetry/`, a container removed by `down`) and opens `/_world/worlds` (D3 #50).
   *
   * `logbook` is the logbook's own worker (L2.03), always started with a `policy` and never from a revision.
   */
  readonly up: (options: {
    readonly root: string;
    readonly name: string;
    readonly port?: number;
    /** Default: the project's current revision. */
    readonly revision?: string;
    /** For `logbook` only: who may write to it. */
    readonly policy?: LogbookSetup;
    /** Where the logbook is, for the portal route an environment serves (`ARCHITECT_LOGBOOK_URL`). Default: the running `logbook` environment, if there is one (D3 #131). */
    readonly logbook?: string;
  }) => Effect.Effect<Up, EnvironmentFailed>;
  /** Stop it, and everything it started. An environment that isn't running is not an error. */
  readonly down: (options: { readonly root: string; readonly name: string }) => Effect.Effect<void, EnvironmentFailed>;
  readonly status: (options: { readonly root: string; readonly name: string }) => Effect.Effect<Status, EnvironmentFailed>;
}
