// Author-owned package fixture preparation: real esbuild, declaration emit, npm pack and archive extraction, no registry.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { expect } from "vitest";
import { repo } from "../layer1/support.ts";

export const fixtures = join(repo, "e2e/fixtures/layer3");
const tool = (command: string, args: ReadonlyArray<string>, cwd: string) => {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
  expect(result.status, `${command}: ${result.stdout}\n${result.stderr}`).toBe(0);
  return result.stdout;
};
const sourceFiles = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : entry.name.endsWith(".ts") ? [join(dir, entry.name)] : []);
const link = (from: string, to: string) => { mkdirSync(dirname(to), { recursive: true }); symlinkSync(from, to); };

export const installFixture = (root: string, kind = "echo", variant?: string, version = "1.0.0") => {
  const work = join(root, ".architect/fixture-build", kind);
  rmSync(work, { recursive: true, force: true });
  cpSync(join(fixtures, kind), work, { recursive: true });
  if (variant) {
    const overlay = join(work, "variants", variant, "src");
    if (existsSync(overlay)) cpSync(overlay, join(work, "src"), { recursive: true });
    else cpSync(join(work, "variants", `${variant}.ts`), join(work, "src/worker.ts"));
  }
  const manifest = JSON.parse(readFileSync(join(work, "package.json"), "utf8")) as { name: string; version: string };
  expect(manifest.name).toMatch(/^@fixture\/[a-z][a-z0-9-]*$/);
  manifest.version = version;
  writeFileSync(join(work, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
  link(join(repo, "packages/blueprint"), join(work, "node_modules/@architect/blueprint"));
  link(join(repo, "packages/target-effect"), join(work, "node_modules/@architect/target-effect"));
  link(join(repo, "node_modules/effect"), join(work, "node_modules/effect"));
  link(join(repo, "node_modules/@types"), join(work, "node_modules/@types"));
  writeFileSync(join(work, "tsconfig.json"), JSON.stringify({ extends: join(repo, "tsconfig.base.json"), compilerOptions: {
    noEmit: false, declaration: true, emitDeclarationOnly: true, rootDir: "src", outDir: "dist",
  }, include: ["src/**/*.ts"] }));
  tool(join(repo, "node_modules/.bin/tsc"), ["-p", join(work, "tsconfig.json")], work);
  tool(join(repo, "packages/prove/node_modules/.bin/esbuild"), [...sourceFiles(join(work, "src")), "--format=esm", "--platform=neutral",
    `--outbase=${join(work, "src")}`, `--outdir=${join(work, "dist")}`, "--log-level=warning"], work);
  const archiveDir = join(root, ".architect/fixture-archives");
  mkdirSync(archiveDir, { recursive: true });
  const npmrc = join(root, ".architect/fixture-npmrc");
  writeFileSync(npmrc, "");
  const packed = JSON.parse(tool("npm", ["pack", "--ignore-scripts", "--offline", "--json", "--pack-destination", archiveDir,
    "--userconfig", npmrc, "--cache", join(root, ".architect/fixture-npm-cache")], work)) as ReadonlyArray<{ filename: string }>;
  expect(packed).toHaveLength(1);
  const archive = join(archiveDir, packed[0]!.filename);
  const installed = join(root, "node_modules", manifest.name);
  rmSync(installed, { recursive: true, force: true });
  mkdirSync(installed, { recursive: true });
  tool("tar", ["-xzf", archive, "--strip-components", "1", "-C", installed], root);
  const project = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  project.dependencies = { ...project.dependencies, [manifest.name]: version };
  writeFileSync(join(root, "package.json"), JSON.stringify(project, null, 2) + "\n");
  return { work, installed, archive, name: manifest.name, sha256: createHash("sha256").update(readFileSync(archive)).digest("hex"),
    files: sourceFiles(join(work, "src")).map((path) => relative(work, path)) };
};
