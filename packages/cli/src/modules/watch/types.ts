// `forman watch --env <name>`: the evals that telemetry can answer, run over an environment's recorded traffic (L2.09, D3 #140 to #149).
import type { Effect } from "effect";
import type { WatchSource } from "@formants/prove";

/** What a command prints and how it exits; only `main.ts` writes it out. */
export interface Said {
  readonly out: string;
  readonly err: string;
  readonly exit: number;
}

export interface WatchCommandApi {
  /**
   * Exit 0 when no eval failed, drift included (drift is a task, written under `.forman/tasks/`); 1 when an eval failed on
   * live traffic; 2 when it couldn't run (no telemetry recorded, no Axiom sink named, no query token, a `--since` that isn't a
   * duration). `since` is `30s`, `15m`, `1h` or `2d`.
   */
  readonly run: (options: {
    readonly root: string;
    readonly environment: string;
    readonly source: WatchSource;
    readonly since: string;
    /** The process environment, for Axiom's query credentials; only `main.ts` reads it. */
    readonly env: Readonly<Record<string, string | undefined>>;
  }) => Effect.Effect<Said>;
}
