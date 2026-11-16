// An npm package built from the generated code: one bundled file, its dependencies as the project has them installed, and for the
// SDK its type declarations. What `npm pack --dry-run` lists is what `npm publish` sends.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { PublishFailed, type Env, type Staged } from "../types.ts";
import { bundle, installedVersion } from "./bundle.ts";
import { cleanEnv } from "./env.ts";
import type { Kind } from "./plan.ts";

/** `node_modules/.bin/<name>` in the project or the nearest folder above it that has one. */
export const binOf = (root: string, name: string): string | undefined => {
  for (let at = resolve(root); ; at = dirname(at)) {
    const bin = join(at, "node_modules/.bin", name);
    if (existsSync(bin)) return bin;
    if (dirname(at) === at) return undefined;
  }
};

const filesUnder = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? filesUnder(join(dir, d.name)) : [join(dir, d.name)]));

/** tsc writes `.ts` specifiers into declarations as they stand in the source; a consumer's compiler wants the `.js` ones. */
const rewriteSpecifiers = (dir: string) => {
  for (const file of filesUnder(dir).filter((f) => f.endsWith(".d.ts"))) {
    const text = readFileSync(file, "utf8");
    const fixed = text.replace(/(["'])(\.\.?\/[^"']*)\.ts\1/g, "$1$2.js$1");
    if (fixed !== text) writeFileSync(file, fixed);
  }
};

/** The SDK's declarations: the project's own tsc over the generated SDK and what it imports, declarations only. */
const declarations = (root: string, dir: string): Effect.Effect<string, PublishFailed> =>
  Effect.try({
    try: () => {
      const tsc = binOf(root, "tsc");
      if (tsc === undefined) throw new Error("no tsc in node_modules/.bin to write the SDK's type declarations with");
      const types = join(dir, "types");
      const config = join(dir, "tsconfig.types.json");
      writeFileSync(config, JSON.stringify({
        extends: join(resolve(root), "tsconfig.json"),
        include: [],
        files: [join(resolve(root), "generated/sdk/src/index.ts")],
        compilerOptions: { noEmit: false, emitDeclarationOnly: true, declaration: true, rewriteRelativeImportExtensions: true, allowImportingTsExtensions: false, outDir: types, rootDir: resolve(root) },
      }));
      const run = spawnSync(tsc, ["-p", config, "--pretty", "false"], { cwd: resolve(root), encoding: "utf8" });
      rmSync(config);
      if (run.status !== 0) throw new Error(`tsc couldn't write the SDK's declarations:\n${(run.stdout + run.stderr).trim().split("\n").slice(0, 6).join("\n")}`);
      rewriteSpecifiers(types);
      return "types/generated/sdk/src/index.d.ts";
    },
    catch: (e) => new PublishFailed({ message: String((e as { message?: unknown }).message ?? e) }),
  });

/** What `npm pack --dry-run` says the package holds: the files and their sizes, exactly as `npm publish` would send them. */
const listing = (dir: string, env: Env): Effect.Effect<Staged["files"], PublishFailed> =>
  Effect.try({
    try: () => {
      const run = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: dir, encoding: "utf8", env: cleanEnv(env) });
      if (run.status !== 0) throw new Error(`npm pack failed: ${run.stderr.trim().split("\n")[0] ?? ""}`);
      const [pack] = JSON.parse(run.stdout) as ReadonlyArray<{ readonly files: ReadonlyArray<{ readonly path: string; readonly size: number }> }>;
      return (pack?.files ?? []).map((f) => ({ path: f.path, bytes: f.size })).sort((a, b) => a.path.localeCompare(b.path));
    },
    catch: (e) => new PublishFailed({ message: String((e as { message?: unknown }).message ?? e) }),
  });

/** Build `@<project>/<kind>` at `version` into `<out>/<kind>/`, ready for `npm publish`. */
export const stage = (options: { readonly root: string; readonly env: Env; readonly project: string; readonly kind: Kind; readonly version: string; readonly out: string }): Effect.Effect<Staged, PublishFailed> =>
  Effect.gen(function* () {
    const { root, project, kind, version } = options;
    const dir = join(options.out, kind);
    yield* Effect.try({ try: () => { rmSync(dir, { recursive: true, force: true }); mkdirSync(join(dir, "dist"), { recursive: true }); }, catch: (e) => new PublishFailed({ message: String(e) }) });
    const entry = kind === "sdk" ? "generated/sdk/src/index.ts" : "generated/cli/src/main.ts";
    if (!existsSync(join(resolve(root), entry))) return yield* new PublishFailed({ message: `${entry} is missing: run \`architect generate\` first` });
    const bundled = yield* bundle({ root, entry, outfile: join(dir, "dist", kind === "sdk" ? "index.js" : "main.js"), format: "esm", platform: kind === "sdk" ? "neutral" : "node", version });
    const dependencies: Record<string, string> = {};
    for (const name of bundled.imports) {
      const have = installedVersion(root, name);
      if (have === undefined) return yield* new PublishFailed({ message: `the ${kind} imports ${name}, which is not installed in ${resolve(root)}: run your package manager's install` });
      dependencies[name] = have;
    }
    const types = kind === "sdk" ? yield* declarations(root, dir) : undefined;
    const manifest = {
      name: `@${project}/${kind}`,
      version,
      description: kind === "sdk" ? `The ${project} client, generated from its blueprint.` : `The ${project} command line, generated from its blueprint.`,
      type: "module",
      ...(kind === "sdk" ? { exports: { ".": { types: `./${types}`, default: "./dist/index.js" } }, types: `./${types}` } : { bin: { [project]: "./dist/main.js" } }),
      files: kind === "sdk" ? ["dist", "types"] : ["dist"],
      dependencies,
      publishConfig: { access: "public" },
    };
    yield* Effect.try({ try: () => writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2) + "\n"), catch: (e) => new PublishFailed({ message: String(e) }) });
    return { name: manifest.name, version, dir, files: yield* listing(dir, options.env) } satisfies Staged;
  });
