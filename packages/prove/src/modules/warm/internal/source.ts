import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** What a world of dev serves (wrangler's own bundles under `.wrangler` are its output, not its input): the handlers, the blueprint, the generated Worker. */
const SOURCES = ["src", "blueprint", "generated/server"];

/** The newest modification time, in milliseconds, of any file under the project's sources; 0 when there are none. */
export const newestChange = (root: string): number => {
  const walk = (path: string): number => {
    const stat = statSync(path);
    if (!stat.isDirectory()) return stat.mtimeMs;
    return readdirSync(path).filter((name) => name !== "node_modules" && name !== ".wrangler").reduce((newest, name) => Math.max(newest, walk(join(path, name))), 0);
  };
  return SOURCES.map((part) => join(root, part)).filter(existsSync).reduce((newest, path) => Math.max(newest, walk(path)), 0);
};
