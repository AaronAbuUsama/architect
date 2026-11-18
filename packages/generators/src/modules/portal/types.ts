// generated/portal: the wire projection the portal app reads instead of project source (F1 §1, D3 #130). Pure: no file system.
import type { Model } from "@formants/compiler";
import type { RenderedFile } from "#modules/render/types.js";

export interface PortalRenderApi {
  /**
   * `generated/portal/blueprint.json` (versioned, deterministic: made from the model and the generated docs, with no clock and
   * no revision, so every machine writes the same bytes) and `generated/portal/main.ts` (the host entry the Worker calls).
   * `docs` are the rendered files of `generated/docs/`.
   */
  readonly files: (project: { readonly name: string; readonly model: Model; readonly docs: ReadonlyArray<RenderedFile> }) => ReadonlyArray<RenderedFile>;
}
