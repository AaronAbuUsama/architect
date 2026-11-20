// The canon's example proves locally: every journey passes, every operation shows its nine evals, and coverage is whole.
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(join(acme, "../signup"));
afterAll(project.remove);

describe("ortho prove --env local on signup, the canon's example", () => {
  it("passes four journeys and four operations with nine evals each, and leaves nothing running", () => {
    const run = ortho(project.root, "prove", "--env", "local", "--port", "0");
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const lines = run.stdout.trimEnd().split("\n");
    expect(lines.filter((l) => /^journey .* ✔ \d+\/\d+ steps$/.test(l))).toHaveLength(4);
    expect(lines.filter((l) => / 9 evals ✔ /.test(l))).toHaveLength(4);
    // The totals are the line's own; when the run leaves a refusal no journey can cause out of them (G3: IdempotencyConflict), it says so after them.
    expect(lines.filter((l) => l === "coverage ✔ moves 3/3 · outcomes 3/3 · refusals 1/1 · runtime refusals 2/4" || l.startsWith("coverage ✔ moves 3/3 · outcomes 3/3 · refusals 1/1 · runtime refusals 2/4 (not counted: IdempotencyConflict,")), "the coverage line").toHaveLength(1);
    expect(lines.at(-1)).toBe("prove ✔");
    nothingRunning(project.root);
  });
});
