// Rendering: the model in, the files of `generated/` (and the scaffolds a project lacks) out. Pure: no file system.
import type { Model } from "@formants/compiler";

export interface RenderedFile {
  /** Relative to the project root, forward slashes. */
  readonly path: string;
  readonly content: string;
  /** A scaffold: written once if absent, then the project's own. Everything else is regenerated every time. */
  readonly scaffold: boolean;
}

export interface Project {
  /** The project's name, from its folder: `examples/acme` is `acme`. */
  readonly name: string;
  readonly model: Model;
}

export interface RenderApi {
  readonly files: (project: Project) => ReadonlyArray<RenderedFile>;
}
