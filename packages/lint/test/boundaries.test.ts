// The package rules hold: each planted fixture breaks one, and lint names the rule.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "../../..");
const rule = "enforce-module-boundaries";

// The workspace config, with fixtures no longer ignored: one source of rules.
const fixturesConfig = (): string => {
  const config = JSON.parse(readFileSync(join(root, ".oxlintrc.json"), "utf8"));
  config.ignorePatterns = config.ignorePatterns.filter((p: string) => !p.includes("fixtures"));
  // The copy lives in tmp/, so a plugin given by a relative path is given from the root instead.
  config.jsPlugins = config.jsPlugins.map((p: string) => (p.startsWith(".") ? join(root, p) : p));
  mkdirSync(join(root, "tmp"), { recursive: true });
  const path = join(root, "tmp", "oxlintrc.fixtures.json");
  writeFileSync(path, JSON.stringify(config));
  return path;
};

const lint = (file: string) => {
  const run = spawnSync("pnpm", ["exec", "oxlint", "-c", fixturesConfig(), file], { cwd: root, encoding: "utf8" });
  return { exit: run.status, output: run.stdout + run.stderr };
};

describe("module boundaries", () => {
  it.each([
    ["blueprint imports compiler", "packages/orthograph/test/fixtures/boundaries/imports-compiler.ts"],
    ["blueprint imports a package other than Effect", "packages/orthograph/test/fixtures/boundaries/imports-other-package.ts"],
    ["runtime code imports generators", "packages/language-effect/test/fixtures/boundaries/imports-generators.ts"],
  ])("fails lint when %s", (_, file) => {
    const { exit, output } = lint(file);
    expect(exit).toBe(1);
    expect(output).toContain(rule);
  });

  it("passes when blueprint imports Effect", () => {
    expect(lint("packages/orthograph/test/fixtures/boundaries/imports-effect.ts").exit).toBe(0);
  });
});
