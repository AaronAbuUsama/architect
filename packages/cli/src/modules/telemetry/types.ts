// `forman telemetry view | stop | trace <id> | open <id>`: seeing what a call did (O1, D3 #100 to #104).
import type { Effect } from "effect";

/** What a command prints and how it exits; only `main.ts` writes it out. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
  /** A page for `main.ts` to open in the browser. */
  readonly open?: string;
}

export interface TelemetryCommandApi {
  /** Start the local viewer, or say where the running one is. Grafana with no login, or the login to use when it asks. */
  readonly view: () => Effect.Effect<Said>;
  /** Stop and remove the viewer. Nothing running is not an error. */
  readonly stop: () => Effect.Effect<Said>;
  /**
   * Print a trace as a tree with its logs, read from the files the Collector wrote (`TraceSource`): a refusal marked
   * `refused`, a defect marked `✘ defect`. `env` narrows the search to `local` (prove) or an environment's own folder.
   * It needs no viewer and works over SSH.
   */
  readonly trace: (options: { readonly root: string; readonly id: string; readonly env?: string }) => Effect.Effect<Said>;
  /** Where the trace is shown: the viewer's Explore, for a viewer that is running. `main.ts` opens it. */
  readonly open: (options: { readonly root: string; readonly id: string; readonly env?: string }) => Effect.Effect<Said>;
}
