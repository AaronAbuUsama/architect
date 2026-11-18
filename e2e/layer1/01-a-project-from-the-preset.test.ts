// Check 1: a project starts the way a user starts one. Orthograph is published to a local Verdaccio, the preset makes a
// workspace, and ortho check and prove pass in it (tools/e2e/starter.sh, D2 #71).
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repo } from "./support.ts";

describe("check 1: create-nx-workspace --preset=@orthograph/preset", () => {
  it("makes a project whose check and prove pass, from packages installed out of a registry", () => {
    const run = spawnSync(join(repo, "tools/e2e/starter.sh"), { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    expect(run.status, run.stdout.slice(-4000) + run.stderr.slice(-4000)).toBe(0);
    expect(run.stdout + run.stderr).toContain("Successfully created the workspace");
    expect(run.stdout).toMatch(/^check ✔$/m);
    expect(run.stdout).toMatch(/^session\.sign-in 9 evals ✔/m);
    expect(run.stdout.trimEnd().split("\n").at(-1)).toBe("prove ✔");
  });
});
