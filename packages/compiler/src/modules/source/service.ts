import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer } from "effect";
import { BlueprintSource, SourceError } from "./types.ts";

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") ? [full] : [];
  });

/** The blueprint as it is on disk, loaded with Node's own module loader. */
export const nodeSource = (projectRoot: string) => {
  const root = join(projectRoot, "blueprint");
  return Layer.succeed(BlueprintSource, {
    list: Effect.try({
      try: () => walk(root).map((f) => relative(root, f).split(sep).join("/")).sort(),
      catch: (e) => new SourceError({ message: `can't list ${root}: ${String(e)}` }),
    }),
    load: (path) =>
      Effect.tryPromise({
        try: () => import(pathToFileURL(join(root, path)).href) as Promise<Record<string, unknown>>,
        catch: (e) => new SourceError({ message: `can't load blueprint/${path}: ${String(e)}` }),
      }).pipe(Effect.map((exports) => ({ path, exports }))),
  });
};
