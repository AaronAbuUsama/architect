// `ortho watch --env <name>`: the evals that telemetry can answer, run over what an environment has recorded (L2.09, O1).
import { Data, type Effect } from "effect";
import type { Env, Reader } from "#modules/sinks/types.js";
import type { TraceSource } from "#modules/telemetry/types.js";

export class WatchFailed extends Data.TaggedError("WatchFailed")<{ readonly message: string }> {}

/** Where the traces come from: the environment's own Collector's files, or Axiom's query API. */
export type SourceName = "file" | "axiom";

export interface Watched {
  /** What to print, one line each. */
  readonly lines: ReadonlyArray<string>;
  /** The operations whose p95 is over their budget. */
  readonly drift: ReadonlyArray<string>;
  /** The tasks written for them, relative to the project root. */
  readonly tasks: ReadonlyArray<string>;
  /** No eval failed. Drift is a task and a refusal an outcome: neither fails a watch. A defect is counted, never a failure of its own. */
  readonly passed: boolean;
}

export interface WatchApi {
  /**
   * Judge the last `since` milliseconds of `environment`'s traffic. Reads through a `TraceSource`: `file` is the folder the
   * environment's Collector writes (`.ortho/environments/<name>/telemetry`), `axiom` is Axiom's query API for the group of the
   * `Telemetry.sink.axiom` the environment names (and fails, saying so, when it names none). Prints, for each operation seen, its
   * p95 against its budget; the refusals by name and code; the defects; each live-judgeable eval; and the operations that drift,
   * each of which becomes a task file under `.ortho/tasks/` (and a task whose operation is back under budget is removed).
   * Calls that `prove` made (their caller span carries `PROVE_SPAN_PREFIX`) are not counted.
   */
  readonly run: (options: {
    readonly root: string;
    readonly environment: string;
    readonly source: SourceName;
    readonly since: number;
    /** The process environment, for Axiom's query credentials; only an entry file reads it. */
    readonly env: Env;
    readonly read?: Reader;
    /** A source to read instead of either: a test's. */
    readonly use?: TraceSource;
  }) => Effect.Effect<Watched, WatchFailed>;
}
