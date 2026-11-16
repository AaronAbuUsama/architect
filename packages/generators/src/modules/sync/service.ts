import { join } from "node:path";
import { Effect } from "effect";
import { Render } from "#modules/render/service.ts";
import type { SyncApi } from "./types.ts";
import { filesUnder } from "./internal/files.ts";
import { modelOf } from "./internal/model.ts";

export const Sync: SyncApi = {
  project: (tree, root) =>
    Effect.gen(function* () {
      const model = yield* modelOf(join(tree.root, root), root);
      const name = root.split("/").at(-1) ?? root;
      const files = Render.files({ name, model });
      // A write whose bytes match what is on disk is no change, so a synced project reports nothing to do.
      for (const f of files) {
        const path = `${root}/${f.path}`;
        if (f.scaffold && tree.exists(path)) continue;
        tree.write(path, f.content);
      }
      const wanted = new Set(files.filter((f) => !f.scaffold).map((f) => `${root}/${f.path}`));
      for (const path of filesUnder(tree, `${root}/generated`)) if (!wanted.has(path)) tree.delete(path);
    }),
};
export { ModelFailed } from "./types.ts";
