// L1.21's check: the generated `Handler` type holds a handler's errors to exactly what its operation declares. The
// fixture is the journey author's (never the builder's): spend failing with an error it doesn't declare.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Dot-folders (.wrangler, .ortho) belong to whatever is running there; a filter also keeps cpSync off its native path,
// which aborts the process when a folder vanishes mid-copy.
const visible = (from: string) => !basename(from).startsWith(".");
const install = (from: string, root: string, to: string) => {
  if (!to.startsWith("src/") && !to.startsWith("generated/")) return cpSync(from, join(root, to));
  mkdirSync(dirname(join(root, to)), { recursive: true });
  writeFileSync(join(root, to), readFileSync(from, "utf8"));
};

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const scratch = join(acme, "test/tmp/handler-type");
const tsc = (root: string) => spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", root, "--noEmit", "--pretty", "false"], { cwd: root, encoding: "utf8" });

/** A copy of acme, with `installs` laid over it. */
const copy = (name: string, installs: ReadonlyArray<readonly [string, string]>) => {
  const root = join(scratch, name);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  // acme's options, but its own files: an extended config's `include` is read from where that config sits.
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
    extends: relative(root, join(acme, "tsconfig.json")),
    include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"],
  }));
  for (const [from, to] of installs) install(join(acme, from), root, to);
  return root;
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("the generated Handler type", () => {
  it("rejects a handler that fails with an error its operation doesn't declare", { timeout: 120_000 }, () => {
    const root = copy("undeclared-error", [["test/fixtures/types/undeclared-error/spend.ts", "src/allowance/spend.ts"]]);
    const run = tsc(root);
    expect(run.status).not.toBe(0);
    const errors = run.stdout.split("\n").filter((l) => l.includes("error TS"));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.every((l) => l.startsWith("src/allowance/spend.ts"))).toBe(true);
    expect(errors.join("\n")).toContain("AllowanceLimitTooHigh");
  });

  it("accepts acme as written: the same copy, without the plant, compiles", { timeout: 120_000 }, () => {
    const run = tsc(copy("as-written", []));
    expect(run.stdout).toBe("");
    expect(run.status).toBe(0);
  });
});
