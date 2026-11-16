// `architect prove --env local`: a fresh local world and a real collector, every journey run, the nine evals judged.
import { Data, type Effect, type Scope } from "effect";

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
  readonly run: (options: { readonly root: string; readonly port: number }) => Effect.Effect<Report, ProveFailed, Scope.Scope>;
}
