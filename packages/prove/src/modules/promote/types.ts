// `ortho promote --to staging|production`: the exact built bundle, moved on only with the verdicts that earn it (D3 #14, #92).
import { Data, type Effect } from "effect";
import type { Env } from "#modules/verdicts/types.js";

export type Target = "staging" | "production";

/** A promotion the rules refuse: what is wrong, one line each, the first being the verdict (`refused: <rev> has no green verdicts in <env>`). */
export class PromoteRefused extends Data.TaggedError("PromoteRefused")<{ readonly lines: ReadonlyArray<string> }> {}

/** A promotion that couldn't be carried out: no logbook, an environment that wouldn't start, a bundle that isn't the one asked for. */
export class PromoteFailed extends Data.TaggedError("PromoteFailed")<{ readonly message: string }> {}

export interface Promoted {
  readonly revision: string;
  /** Bare hex of the bundle every environment runs. */
  readonly sha256: string;
  /** For staging: every journey and eval passed in the environment. Production has nothing to prove again. */
  readonly passed: boolean;
  /** For production: the version recorded in the logbook. */
  readonly version?: string;
}

export interface PromoteApi {
  /**
   * Move the revision at `root` (the git commit) to `target`. In order:
   *
   * 1. It refuses a dirty working tree, and a revision with no built bundle or one whose file no longer matches the hash
   *    recorded when it was built. The bundle is never rebuilt here: it is the one `ortho build` made.
   * 2. It refuses a revision whose verdicts, among those posted from `main` (a pull request's never count), are not all
   *    passing for every operation and naming this exact bundle hash: `test` for staging, `staging` (the environment's `promotesFrom`) for production. Nothing
   *    is started for a refused promotion.
   * 3. It starts the target environment on that bundle, or restarts it onto it with its state kept, and checks
   *    `GET /_ortho/bundle` answers the bundle's own revision and sha256.
   * 4. Staging: the journeys and evals run against it, the people signing up for real, and a verdict per operation is
   *    posted with `environment: "staging"`. Production: the release is recorded in the logbook with the version the
   *    model gives (`Releases.next`), unless this revision is already the last release.
   *
   * What the local pass can't reach (the real cloud, a domain) is `say`d as `skipped <destination> (cloud pass)`.
   */
  readonly to: (options: {
    readonly root: string;
    /** The process environment, passed in because only `main.ts` reads it: the logbook's address and who signs for the run. */
    readonly env: Env;
    readonly target: Target;
    readonly say: (line: string) => Effect.Effect<void>;
  }) => Effect.Effect<Promoted, PromoteRefused | PromoteFailed>;
}
