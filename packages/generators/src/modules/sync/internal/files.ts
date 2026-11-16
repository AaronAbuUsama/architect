import type { Tree } from "@nx/devkit";

/** Every file under `dir` in the tree, recursively, past dot-folders: `.wrangler/` is the running world's, not output. */
export const filesUnder = (tree: Tree, dir: string): Array<string> =>
  tree.exists(dir)
    ? tree.children(dir).flatMap((child) => {
        const path = `${dir}/${child}`;
        if (tree.isFile(path)) return [path];
        return child.startsWith(".") ? [] : filesUnder(tree, path);
      })
    : [];
