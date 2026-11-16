// The starter: what `create-nx-workspace <name> --preset=@architect/preset` writes. A copy of `examples/starter`'s
// blueprint, handlers and journeys, with generated/ rendered under the new project's name.
import type { Tree } from "@nx/devkit";

export interface PresetOptions {
  /** The workspace's name, which names the project, its CLI and its SDK client. */
  readonly name: string;
}

/** Where the starter's own files are read from: the published package's `files/`, or the repository's example. */
export interface StarterSource {
  /** Each file under blueprint/, implementation/ and journeys/, by its path from the project root. */
  readonly files: ReadonlyArray<{ readonly path: string; readonly content: string }>;
  /** The starter's compiled model, `generated/model/model.json`. */
  readonly model: string;
  /** The version every `@architect/*` package is installed at: the preset's own. */
  readonly version: string;
}

export interface StarterApi {
  /** Lay the starter into `tree` at its root, as project `name`. Returns the task that installs its packages. */
  readonly write: (tree: Tree, options: PresetOptions, source: StarterSource) => () => void;
  /** Read the starter from a folder holding `blueprint/`, `implementation/`, `journeys/` and `generated/model/`. */
  readonly read: (root: string, version: string) => StarterSource;
}
