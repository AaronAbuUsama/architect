// A plugin's server operation needs its handler module for the worker, `<package>/src/<thing>/<verb>.js`. A missing one
// is refused here, at generate, naming the operation, the package and the host: nothing is shimmed (M1-plugins section 8).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageDir, type Model } from "@orthograph/compiler";

export const missingHandlers = (absoluteRoot: string, model: Model): ReadonlyArray<string> =>
  Object.values(model.operations).flatMap((op) => {
    if (op.kind !== "operation" || !op.from) return [];
    const mount = model.mounts?.[op.from.mount];
    const dir = packageDir(absoluteRoot, op.from.package);
    const src = dir ? (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { orthograph?: { src?: string } }).orthograph?.src ?? "./dist/src" : undefined;
    const module = `src/${op.from.thing}/${op.verb}.js`;
    return dir && src && existsSync(join(dir, src, op.from.thing, `${op.verb}.js`))
      ? []
      : [`${mount?.file ?? "a mount"}: ${op.name} has no handler for the worker in ${op.from.package}: ${op.from.package}/${module} is missing`];
  });
