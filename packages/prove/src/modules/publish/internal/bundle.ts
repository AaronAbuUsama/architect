// A generated entry file (the SDK's index, the CLI's main) bundled into one file, with the project's own sources inside it and every
// package it imports left outside, as a dependency. Shared by the npm packages (ESM) and the single executable (CommonJS).
import { Names } from "orthograph/server";
import { existsSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { build } from "esbuild";
import { PublishFailed } from "../types.ts";

/** The package an import names: `effect/cli` is `effect`, `@effect/platform-node/Foo` is `@effect/platform-node`. */
export const packageOf = (specifier: string) => specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");

/** The version of a package as the project has it installed, looking up from the project like node does; undefined when it is not there. */
export const installedVersion = (root: string, name: string): string | undefined => {
  for (let at = resolve(root); ; at = dirname(at)) {
    const file = join(at, "node_modules", name, "package.json");
    if (existsSync(file)) return (JSON.parse(readFileSync(file, "utf8")) as { readonly version: string }).version;
    if (dirname(at) === at) return undefined;
  }
};

export interface Bundled {
  /** The packages the bundle still imports (and so needs installed), sorted. */
  readonly imports: ReadonlyArray<string>;
}

/**
 * The release version reaches the generated CLI as a constant the bundler replaces (`ORTHO_VERSION`), not as text in the
 * generated source: generated files are the same on every machine and every release, and a CLI run from source says 0.0.0.
 */
export const bundle = (options: {
  readonly root: string;
  readonly entry: string;
  readonly outfile: string;
  readonly format: "esm" | "cjs";
  readonly platform: "node" | "neutral";
  readonly version: string;
  /** With `inline`, nothing stays outside: a single executable has no node_modules to find a package in. */
  readonly inline?: boolean;
}): Effect.Effect<Bundled, PublishFailed> =>
  Effect.tryPromise({
    try: () =>
      build({
        absWorkingDir: resolve(options.root),
        entryPoints: [options.entry],
        outfile: options.outfile,
        bundle: true,
        format: options.format,
        platform: options.platform,
        target: "node24",
        ...(options.inline ? { mainFields: ["module", "main"] } : { packages: "external" as const, mainFields: ["module", "main"] }),
        define: { [Names.variable("VERSION")]: JSON.stringify(options.version) },
        legalComments: "none",
        metafile: true,
        logLevel: "silent",
      }).then((result) => {
        const output = Object.values(result.metafile.outputs)[0];
        const external = (output?.imports ?? []).filter((i) => i.external && !isBuiltin(i.path)).map((i) => packageOf(i.path));
        return { imports: [...new Set(external)].sort() };
      }),
    catch: (e) => new PublishFailed({ message: `couldn't bundle ${options.entry}: ${String((e as { message?: unknown }).message ?? e)}` }),
  });
