// What every Gate 1 check shares: where things are, a project copied somewhere of its own, and the architect command
// run as a user runs it, in a real process.
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { expect } from "vitest";

// Dot-folders (.wrangler, .architect) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");

export const repo = resolve(import.meta.dirname, "../..");
export const acme = join(repo, "examples/acme");
export const cli = join(repo, "packages/cli/src/main.ts");

/** A copy of an example outside the repository, wired to the repository's packages through its node_modules. */
export const copyOf = (example: string, parts: ReadonlyArray<string> = ["blueprint", "generated", "implementation", "journeys", "package.json"]) => {
  // The folder keeps the example's name: the project's name, and so its CLI's and its variables', comes from it.
  const parent = mkdtempSync(join(tmpdir(), "architect-gate1-"));
  const root = join(parent, basename(example));
  for (const part of parts) cpSync(join(example, part), join(root, part), { recursive: true, filter: visible });
  // The example's own packages, and the repository's tools (tsc, oxlint) where check looks for them.
  mkdirSync(join(root, "node_modules"));
  for (const entry of readdirSync(join(example, "node_modules"))) if (entry !== ".bin") symlinkSync(join(example, "node_modules", entry), join(root, "node_modules", entry));
  // pnpm's .bin shims find their package from where they sit, so the copy gets small launchers instead of links.
  mkdirSync(join(root, "node_modules/.bin"));
  for (const tool of ["tsc", "oxlint"]) {
    writeFileSync(join(root, "node_modules/.bin", tool), `#!/bin/sh\nexec "${join(repo, "node_modules/.bin", tool)}" "$@"\n`, { mode: 0o755 });
  }
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    extends: join(example, "tsconfig.json"),
    compilerOptions: { typeRoots: [join(repo, "node_modules/@types"), join(example, "node_modules")] },
    include: ["blueprint/**/*.ts", "generated/**/*.ts", "implementation/**/*.ts", "journeys/**/*.ts"] }));
  return { root, remove: () => rmSync(parent, { recursive: true, force: true }) };
};

export const architect = (root: string, ...args: ReadonlyArray<string>): SpawnSyncReturns<string> =>
  spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Nothing this copy started is still running: no wrangler, workerd or node process names its folder. */
export const nothingRunning = (root: string) =>
  expect(spawnSync("pgrep", ["-fl", root], { encoding: "utf8" }).stdout.trim()).toBe("");
