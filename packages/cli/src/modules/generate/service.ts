import { basename, dirname, resolve } from "node:path";
import { Effect } from "effect";
import { FsTree, flushChanges } from "nx/src/generators/tree.js";
import { Sync } from "@architect/generators/sync";
import type { Change, GenerateApi } from "./types.ts";

const kinds = { CREATE: "created", UPDATE: "updated", DELETE: "deleted" } as const;

export const Generate: GenerateApi = {
  run: (root) =>
    Effect.gen(function* () {
      const abs = resolve(root);
      const tree = new FsTree(dirname(abs), false);
      yield* Sync.project(tree, basename(abs));
      const changes = tree.listChanges();
      yield* Effect.sync(() => flushChanges(dirname(abs), changes));
      return changes.map((c): Change => ({ kind: kinds[c.type], path: c.path.slice(basename(abs).length + 1) }));
    }),
  lines: (changes) =>
    changes.length === 0
      ? ["nothing to change"]
      : changes.map((c) => `${c.kind} ${c.path}${c.path.startsWith("src/") ? " (scaffold: yours from now on)" : ""}`),
};
