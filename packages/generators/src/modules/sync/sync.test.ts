import { resolve } from "node:path";
import { Effect } from "effect";
import { FsTree } from "nx/src/generators/tree.js";
import { describe, expect, it } from "vitest";
import { Sync } from "./service.ts";

// The real workspace, as a tree whose writes stay in memory: nothing here touches the disk.
const repo = resolve(import.meta.dirname, "../../../../..");
const sync = (tree: FsTree) => Effect.runPromise(Sync.project(tree, "examples/acme"));

describe("sync", () => {
  it("changes nothing when generated/ matches the blueprint", async () => {
    const tree = new FsTree(repo, false);
    await sync(tree);
    expect(tree.listChanges()).toEqual([]);
  });

  it("puts back a hand edit and removes a file the blueprint doesn't explain", async () => {
    const tree = new FsTree(repo, false);
    tree.write("examples/acme/generated/sdk/src/allowance/grant.ts", "// edited by hand\n");
    tree.write("examples/acme/generated/sdk/src/allowance/stray.ts", "export {};\n");
    await sync(tree);
    expect(tree.listChanges()).toEqual([]);
  });

  it("never overwrites a scaffold that exists", async () => {
    const tree = new FsTree(repo, false);
    tree.write("examples/acme/src/allowance/grant.ts", "// mine now\n");
    await sync(tree);
    expect(tree.read("examples/acme/src/allowance/grant.ts", "utf8")).toBe("// mine now\n");
  });
});
