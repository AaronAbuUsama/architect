// Check 3: each eval fails on the journey author's planted break for it, naming the operation and the eval, and prove
// exits 1. Performance is review-only (eval 7): its planted break is a slow grant, which raises a review while prove passes.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acme, ortho, copyOf, nothingRunning } from "./support.ts";

const GRANT = "src/allowance/grant.ts";
const planted: ReadonlyArray<{ readonly fixture: string; readonly installs: ReadonlyArray<readonly [string, string]>; readonly line: string; readonly generate?: boolean; readonly review?: true }> = [
  { fixture: "answer-shape", installs: [["grant.ts", GRANT]], line: "allowance.grant answer shape ✘" },
  { fixture: "declared-errors", installs: [["grant.ts", GRANT]], line: "allowance.grant declared errors ✘" },
  { fixture: "machine-path", installs: [["grant.ts", GRANT]], line: "allowance.grant machine path ✘" },
  { fixture: "events", installs: [["grant.ts", GRANT]], line: "allowance.grant events ✘" },
  { fixture: "who-may-call", installs: [["main.ts", "generated/server/main.ts"]], line: "allowance.grant who may call ✘" },
  { fixture: "steps", installs: [["grant.ts", GRANT]], line: "allowance.grant steps ✘" },
  { fixture: "coverage", installs: [["rename.ts", "blueprint/things/organization/verbs/rename.ts"], ["rename.handler.ts", "src/organization/rename.ts"]], line: "organization.rename coverage ✘", generate: true },
  { fixture: "performance", installs: [["grant.ts", GRANT]], line: "allowance.grant performance ✔", review: true },
  { fixture: "explainability", installs: [["grant.ts", GRANT]], line: "allowance.grant explainability ✘" },
];

// Every prove takes port 0, so each gets a free port of its own: two checks, or two worktrees, never meet on one.
describe("check 3: every eval catches its planted break", () => {
  planted.forEach((p) =>
    it(p.review ? `${p.fixture}: prove exits 0 with "${p.line}" and a review` : `${p.fixture}: prove exits 1 with "${p.line}"`, () => {
      const project = copyOf(acme);
      try {
        for (const [from, to] of p.installs) cpSync(join(acme, "test/fixtures/evals", p.fixture, from), join(project.root, to));
        if (p.generate) expect(ortho(project.root, "generate").status).toBe(0);
        const run = ortho(project.root, "prove", "--env", "local", "--port", "0");
        const line = run.stdout.split("\n").find((l) => l.startsWith(p.line));
        expect(line, run.stdout).toBeDefined();
        if (p.review) expect(line).toMatch(/review: p95 \d+ms is over 1\.5x budget/);
        expect(run.status, run.stdout + run.stderr).toBe(p.review ? 0 : 1);
        expect(run.stdout.trimEnd().split("\n").at(-1)).toMatch(p.review ? /^prove ✔/ : /^prove ✘/);
        nothingRunning(project.root);
      } finally {
        project.remove();
      }
    }),
  );
});
