// Check 2: acme proves locally. Every journey passes, every operation shows its nine evals, and coverage holds.
import { afterAll, describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(acme);
afterAll(project.remove);

describe("check 2: ortho prove --env local on acme", () => {
  it("passes eleven journeys and fifteen operations with nine evals each, and leaves nothing running", () => {
    const run = ortho(project.root, "prove", "--env", "local", "--port", "0");
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trimEnd().split("\n");
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(11);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(15);
    for (const op of ["allowance.grant", "allowance.spend", "allowance.revoke", "allowance.get"]) expect(lines.some((l) => l.startsWith(`${op} 9 evals ✔`))).toBe(true);
    expect(lines).toContain("coverage ✔ moves 7/7 · outcomes 7/7 · refusals 4/4 · runtime refusals 14/17");
    expect(lines.at(-1)).toBe("prove ✔");
    nothingRunning(project.root);
  });
});
