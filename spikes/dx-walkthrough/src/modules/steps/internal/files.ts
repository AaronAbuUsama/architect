// The project's files as a value, and making one part of it match the draft.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Folders that are the machine's, not the project's: installed packages and what the tools keep between runs. */
const SKIP = new Set(["node_modules", ".ortho", ".wrangler", ".nx"]);

const walk = (root: string, dir: string): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(root, path) : [relative(root, path)];
  });

/** Every file of the project, by path, sorted. */
export const snapshot = (root: string): ReadonlyMap<string, string> =>
  new Map([...walk(root, root)].sort().map((p) => [p, readFileSync(join(root, p), "utf8")] as const));

/** Make `part` of `dir` exactly the draft's: files the draft lacks go, the draft's come in. */
export const match = (dir: string, draft: string, part: string): void => {
  rmSync(join(dir, part), { recursive: true, force: true });
  if (existsSync(join(draft, part))) cpSync(join(draft, part), join(dir, part), { recursive: true });
};

/** Empty `dir` but for its installed packages. */
export const clear = (dir: string): void => {
  for (const entry of existsSync(dir) ? readdirSync(dir) : []) if (entry !== "node_modules") rmSync(join(dir, entry), { recursive: true, force: true });
};
