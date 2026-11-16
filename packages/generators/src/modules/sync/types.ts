// Sync: keep a project's `generated/` exactly what its blueprint says, and scaffold what it lacks.
import { Data, type Effect } from "effect";
import type { Tree } from "@nx/devkit";

/** The compiler refused the blueprint. Its problems, as it printed them. */
export class ModelFailed extends Data.TaggedError("ModelFailed")<{ readonly root: string; readonly problems: string }> {}

export interface SyncApi {
  /** Render `root`'s blueprint into the tree: write every generated file, scaffold missing handlers, remove orphans. */
  readonly project: (tree: Tree, root: string) => Effect.Effect<void, ModelFailed>;
}
