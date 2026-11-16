import type { Tree } from "@nx/devkit";

/** Every file under `dir` in the tree, recursively. */
export const filesUnder = (tree: Tree, dir: string): Array<string> =>
  tree.exists(dir)
    ? tree.children(dir).flatMap((child) => {
        const path = `${dir}/${child}`;
        return tree.isFile(path) ? [path] : filesUnder(tree, path);
      })
    : [];
