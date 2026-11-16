// The Nx sync generator: `nx sync` writes, `nx sync:check` fails on drift. Registered in nx.json `sync.globalGenerators`.
import { getProjects, type Tree } from "@nx/devkit";
import { Effect } from "effect";
import { Sync } from "#modules/sync/service.js";

export default async function sync(tree: Tree) {
  const roots = [...getProjects(tree).values()].map((p) => p.root).filter((root) => tree.exists(`${root}/blueprint`));
  await Effect.runPromise(Effect.forEach(roots, (root) => Sync.project(tree, root), { discard: true }));
  const changed = tree.listChanges().map((c) => `${c.type} ${c.path}`);
  return changed.length === 0
    ? undefined
    : { outOfSyncMessage: "generated/ doesn't match the blueprint. Run nx sync.", outOfSyncDetails: changed };
}
