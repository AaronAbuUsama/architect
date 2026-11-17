// This stage's package-entry boundary, measured from actual esbuild inputs/imports rather than removed output text.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { expect } from "vitest";
import { repo } from "../layer1/support.ts";

type Import = { path: string; external?: boolean };
type Meta = { inputs: Record<string, { imports: ReadonlyArray<Import> }>; outputs: Record<string, { imports: ReadonlyArray<Import> }> };
export const bundle = (root: string, entry: string, name: string) => {
  const output = join(root, ".architect/closures", name);
  mkdirSync(dirname(output), { recursive: true });
  const result = spawnSync(join(repo, "packages/prove/node_modules/.bin/esbuild"), [entry, "--bundle", "--format=esm", "--platform=browser",
    "--target=es2024", "--external:node:*", "--external:cloudflare:*", `--outfile=${output}.js`, `--metafile=${output}.json`, "--log-level=warning"],
  { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  return JSON.parse(readFileSync(`${output}.json`, "utf8")) as Meta;
};
export const violations = (root: string, meta: Meta, tier: "client" | "worker") => {
  const fixture = realpathSync(join(root, "node_modules/@fixture/echo"));
  const pure = new Set(["dist/descriptor.js", "dist/choices.js", "dist/blueprint.js", "dist/echo.js"]);
  const bad: Array<string> = [];
  for (const name of Object.keys(meta.inputs)) {
    const path = resolve(root, name);
    if (path.startsWith(fixture + "/")) {
      const local = relative(fixture, path);
      if (tier === "client" ? !pure.has(local) : local === "dist/node.js") bad.push(`fixture:${local}`);
    }
    if (/[/\\](compiler|generators)[/\\](src|dist)[/\\]/.test(path)) bad.push("build-only module");
    if (tier === "client" && /[/\\]@fixture[/\\](remote|effect-remote|node-remote)[/\\]/.test(path)) bad.push("foreign runtime");
  }
  if (tier === "client") for (const part of [...Object.values(meta.inputs), ...Object.values(meta.outputs)]) {
    for (const imported of part.imports) if (imported.path.startsWith("node:")) bad.push(imported.path);
  }
  return [...new Set(bad)].sort();
};
export const typecheckSdk = (root: string) => {
  const dir = join(root, ".architect/browser-types");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "main.ts"), `import { Effect } from "effect";\nimport * as Sdk from "../../generated/sdk/src/index.ts";\nconst request: Effect.Effect<{readonly text: string}, unknown> = Sdk.kits.fixture.echo.repeat({text:"hello"}).pipe(Effect.provide(Sdk.layer("http://127.0.0.1:19160")));\nvoid request;\n// @ts-expect-error a numeric payload is not the declared text\nSdk.kits.fixture.echo.repeat({text:7});\n`);
  writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({ extends: join(root, "tsconfig.json"), compilerOptions: {
    types: [], lib: ["es2024", "dom", "dom.iterable"], noEmit: true,
  }, include: ["main.ts"] }));
  const tsc = join(root, "node_modules/.bin/tsc");
  const checked = spawnSync(tsc, ["-p", join(dir, "tsconfig.json")], { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(checked.status, checked.stdout + checked.stderr).toBe(0);
  const files = spawnSync(tsc, ["-p", join(dir, "tsconfig.json"), "--listFilesOnly"], { cwd: root, encoding: "utf8", timeout: 180_000 });
  expect(files.status, files.stdout + files.stderr).toBe(0);
  expect(files.stdout).not.toMatch(/[/\\]@fixture[/\\](remote|effect-remote|node-remote)[/\\]/);
};
