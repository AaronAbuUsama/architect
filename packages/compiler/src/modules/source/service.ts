import { readdirSync, statSync } from "node:fs";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, Layer } from "effect";
import { BlueprintSource, SourceError, type PluginPackage } from "./types.ts";
import { blueprintFilesOf, dependenciesOf, integrityOf, packageDir, readManifest, resolveFrom } from "./internal/plugins.ts";

const walk = (dir: string): Array<string> =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".ts") ? [full] : [];
  });

const importing = (url: string, what: string) =>
  Effect.tryPromise({
    try: () => import(url) as Promise<Record<string, unknown>>,
    catch: (e) => new SourceError({ message: `can't load ${what}: ${String(e)}` }),
  });

/** The blueprint as it is on disk, loaded with Node's own module loader; plugins as the project resolves them. */
export const nodeSource = (projectRoot: string) => {
  const root = join(projectRoot, "blueprint");
  const sync = <A>(what: string, f: () => A) => Effect.try({ try: f, catch: (e) => new SourceError({ message: `${what}: ${String(e)}` }) });

  const plugin = (name: string): Effect.Effect<PluginPackage | undefined, SourceError> => Effect.gen(function* () {
    const dir = packageDir(projectRoot, name);
    if (!dir) return undefined;
    const manifest = yield* sync(`can't read ${name}'s package.json`, () => readManifest(join(dir, "package.json")));
    if (!manifest.orthograph) return undefined;
    const known = { name, version: manifest.version ?? "0.0.0", kind: manifest.orthograph.kind ?? "" };
    const loaded = yield* Effect.result(Effect.flatMap(sync(`can't resolve ${name}`, () => resolveFrom(projectRoot, name)), (url) => importing(url, name)));
    return loaded._tag === "Success"
      ? { ...known, descriptor: loaded.success["default"] }
      : { ...known, descriptor: undefined, problem: `${name}: its root export can't be loaded (${loaded.failure.message})` };
  });

  return Layer.succeed(BlueprintSource, {
    list: sync(`can't list ${root}`, () => walk(root).map((f) => relative(root, f).split(sep).join("/")).sort()),
    load: (path) => importing(pathToFileURL(join(root, path)).href, `blueprint/${path}`).pipe(Effect.map((exports) => ({ path, exports }))),
    plugins: Effect.gen(function* () {
      const manifest = yield* sync("can't read the project's package.json", () => readManifest(join(projectRoot, "package.json")));
      const found = yield* Effect.forEach(dependenciesOf(manifest), plugin);
      return found.filter((p): p is PluginPackage => p !== undefined);
    }),
    pluginFiles: (name) => Effect.gen(function* () {
      const dir = packageDir(projectRoot, name);
      if (!dir) return yield* new SourceError({ message: `${name}: isn't installed` });
      const declared = readManifest(join(dir, "package.json")).orthograph?.blueprint;
      const folder = declared ? join(dir, declared) : undefined;
      if (!folder || !existsSync(folder)) {
        return yield* new SourceError({ message: `${name}: its package.json declares no blueprint folder that exists (orthograph.blueprint is ${JSON.stringify(declared ?? null)})` });
      }
      const integrity = yield* sync(`can't read ${name}`, () => integrityOf(dir));
      const files = yield* Effect.forEach(blueprintFilesOf(folder), (path) =>
        importing(pathToFileURL(join(folder, path)).href, `${name}/blueprint/${path}`).pipe(
          Effect.map((exports) => ({ path, exports, specifier: `${name}/blueprint/${path}` }))));
      return { integrity, files };
    }),
  });
};

/** Where the project has a package installed, and a plugin's blueprint folder: for the loaders that run journeys. */
export { packageDir, pluginFolder } from "./internal/plugins.ts";
