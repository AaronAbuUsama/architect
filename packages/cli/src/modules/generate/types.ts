// `ortho generate`: what `nx sync` does for one project, run from the ortho command. Writes `generated/` from
// the blueprint, scaffolds each handler once its operation has no blanks, and never overwrites a scaffold.
import type { Effect } from "effect";
import type { ModelFailed } from "@orthograph/generators/sync";

/** One file the run changed: made, rewritten, or removed (an orphan in `generated/`). */
export interface Change {
  readonly kind: "created" | "updated" | "deleted";
  readonly path: string;
}

export interface GenerateApi {
  /** Bring `root` in line with its blueprint, and say what changed: nothing, on a second run. */
  readonly run: (root: string) => Effect.Effect<ReadonlyArray<Change>, ModelFailed>;
  /** `created src/allowance/spend.ts (scaffold)`, one line per change, or `nothing to change`. */
  readonly lines: (changes: ReadonlyArray<Change>) => ReadonlyArray<string>;
}
