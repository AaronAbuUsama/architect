// `architect prove --env local`: a fresh local world and a real collector, every journey run, the nine evals judged.
// `architect prove --env test`: the same, in a world of the long-lived test environment, with a signed verdict per operation.
import { Data, type Effect, type Scope } from "effect";
import type { Result, TokenSource } from "#modules/verdicts/types.js";

export class ProveFailed extends Data.TaggedError("ProveFailed")<{ readonly message: string }> {}

export interface Report {
  /** What prove says, line by line: journeys, then each operation's evals, then coverage, then the verdict. */
  readonly lines: ReadonlyArray<string>;
  readonly passed: boolean;
}

export interface ProveApi {
  /**
   * Prove the project at `root` on a local world served on `port`. Nothing is left running when the scope closes:
   * wrangler is stopped and the collector container removed. Fails only when it can't run at all (no model, no
   * Docker, no world); a project that runs and fails its journeys or evals is a report with `passed: false`.
   */
  readonly run: (options: {
    readonly root: string;
    readonly port: number;
    /** Start the local viewer first (it stays up: `telemetry stop` ends it) and, for every failure, print its trace id and link. */
    readonly view?: boolean;
    /** The process environment, for the sinks' tokens (`AXIOM_TOKEN`): only an entry file reads it. */
    readonly env?: Readonly<Record<string, string | undefined>>;
  }) => Effect.Effect<Report, ProveFailed, Scope.Scope>;

  /**
   * `architect dev`: a local world on `port` that stays up while the scope is open. While the viewer runs it also has a
   * collector, so its traces are in the viewer; the local environment's other sinks get what they are named for.
   */
  readonly dev: (options: {
    readonly root: string;
    readonly port: number;
    readonly env?: Readonly<Record<string, string | undefined>>;
  }) => Effect.Effect<{ readonly url: string; readonly log: string; readonly notes: ReadonlyArray<string> }, ProveFailed, Scope.Scope>;

  /**
   * Prove the project in a world of the test environment, which it starts if it is down, on the revision it was asked
   * to prove (the git commit). Each line is `say`d as it is true, so a run that dies part-way has said where it was:
   * `world test-<id> · expires in <lifetime>` once the world exists, the journeys and evals, `verdicts <op> ✔ …
   * (revision <rev>)` once the logbook holds them, and `world destroyed` last. The world is destroyed whether the run
   * passes, fails or is interrupted; only a killed process leaves it, for its alarm and `worlds reap`.
   * `lifetime` overrides the environment's own (`20s`, `2 hours`).
   */
  readonly test: (options: {
    readonly root: string;
    readonly lifetime?: string;
    /** The process environment, for the telemetry sinks' tokens (`AXIOM_TOKEN`): only an entry file reads it. */
    readonly env?: Readonly<Record<string, string | undefined>>;
    readonly logbook: string;
    readonly token: TokenSource;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<{ readonly passed: boolean }, ProveFailed>;

  /**
   * Prove the project against an environment that is already running (staging), and post nothing. A real environment has
   * no `/_world/cast`, so each journey's people sign up for real through Better Auth's own routes, with credentials of
   * their own; the journeys and the nine evals are otherwise the same, judged from the environment's own collector
   * (`telemetry`, the folder it writes). Each line is `say`d as it is true. Returns the verdict of each operation, which the
   * caller records: a failing one too.
   */
  readonly against: (options: {
    readonly root: string;
    readonly url: string;
    readonly telemetry: string;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<{ readonly passed: boolean; readonly results: ReadonlyArray<Result> }, ProveFailed>;
}
