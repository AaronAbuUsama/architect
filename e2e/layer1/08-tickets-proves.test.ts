// The canon's example proves locally: every journey passes, every operation shows its nine evals, and coverage is whole.
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(join(acme, "../tickets"));
afterAll(project.remove);

describe("ortho prove --env local on tickets, the canon's example", () => {
  it("passes six journeys and seven operations with nine evals each, and leaves nothing running", () => {
    const run = ortho(project.root, "prove", "--env", "local", "--port", "8875");
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trimEnd().split("\n");
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(6);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(7);
    expect(lines).toContain("coverage ✔ moves 3/3 · outcomes 3/3 · refusals 1/1 · runtime refusals 2/2");
    expect(lines.at(-1)).toBe("prove ✔");
    nothingRunning(project.root);
  });
});
