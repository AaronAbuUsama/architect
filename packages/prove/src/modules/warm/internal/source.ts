import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** What a world of dev serves: the handlers, the blueprint, the generated Worker. */
const SOURCES = ["src", "blueprint", "generated/server"];
/** Never input: installed packages, and wrangler's own bundles (its output). */
const SKIPPED = new Set(["node_modules", ".wrangler"]);

const filesUnder = (path: string): ReadonlyArray<string> =>
  statSync(path).isDirectory()
    ? readdirSync(path).filter((name) => !SKIPPED.has(name)).flatMap((name) => filesUnder(join(path, name)))
    : [path];

const sourceFiles = (root: string): ReadonlyArray<string> =>
  SOURCES.map((part) => join(root, part)).filter(existsSync).flatMap(filesUnder).sort();

/** The newest modification time, in milliseconds, of any file under the project's sources; 0 when there are none. */
export const newestChange = (root: string): number => sourceFiles(root).reduce((newest, file) => Math.max(newest, statSync(file).mtimeMs), 0);

/**
 * A hash of which source files there are and what each holds. A file added, deleted, renamed or edited changes it, which a
 * newest-modification time cannot say of a deletion.
 */
export const fingerprint = (root: string): string => {
  const hash = createHash("sha256");
  for (const file of sourceFiles(root)) hash.update(`${relative(root, file)}\0${createHash("sha256").update(readFileSync(file)).digest("hex")}\n`);
  return hash.digest("hex");
};
