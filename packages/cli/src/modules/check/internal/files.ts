// The project's files as check reads them, and the tools it runs, found the way a shell would: up from the project.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export const tsFiles = (dir: string): ReadonlyArray<string> =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? tsFiles(join(dir, d.name)) : d.name.endsWith(".ts") ? [join(dir, d.name)] : []))
    : [];

export const allFiles = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? allFiles(join(dir, d.name)) : [join(dir, d.name)])) : [];

export const textsUnder = (root: string, dir: string) => tsFiles(join(root, dir)).map((f) => ({ path: relative(root, f), text: readFileSync(f, "utf8") }));

/** `node_modules/.bin/<name>` in the project or the nearest folder above it that has one. */
export const binOf = (root: string, name: string): string | undefined => {
  for (let at = root; ; at = dirname(at)) {
    const bin = join(at, "node_modules/.bin", name);
    if (existsSync(bin)) return bin;
    if (dirname(at) === at) return undefined;
  }
};
