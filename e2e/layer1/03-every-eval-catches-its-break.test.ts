// Check 3: each eval fails on the journey author's planted break for it, naming the operation and the eval, and prove
// exits 1. Performance is review-only and never fails, so it has no break to catch.
import { cpSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acme, architect, copyOf, nothingRunning } from "./support.ts";

const GRANT = "implementation/handlers/allowance/grant.ts";
const planted: ReadonlyArray<{ readonly fixture: string; readonly installs: ReadonlyArray<readonly [string, string]>; readonly line: string; readonly generate?: boolean }> = [
  { fixture: "answer-shape", installs: [["grant.ts", GRANT]], line: "allowance.grant answer shape ✘" },
  { fixture: "declared-errors", installs: [["grant.ts", GRANT]], line: "allowance.grant declared errors ✘" },
  { fixture: "machine-path", installs: [["grant.ts", GRANT]], line: "allowance.grant machine path ✘" },
  { fixture: "events", installs: [["grant.ts", GRANT]], line: "allowance.grant events ✘" },
  { fixture: "who-may-call", installs: [["main.ts", "generated/server/main.ts"]], line: "allowance.grant who may call ✘" },
  { fixture: "steps", installs: [["grant.ts", GRANT]], line: "allowance.grant steps ✘" },
  { fixture: "coverage", installs: [["rename.ts", "blueprint/things/organization/verbs/rename.ts"], ["rename.handler.ts", "implementation/handlers/organization/rename.ts"]], line: "organization.rename coverage ✘", generate: true },
  { fixture: "explainability", installs: [["grant.ts", GRANT]], line: "allowance.grant explainability ✘" },
];

describe("check 3: every eval catches its planted break", () => {
  planted.forEach((p, i) =>
    it(`${p.fixture}: prove exits 1 with "${p.line}"`, () => {
      const project = copyOf(acme);
      try {
        for (const [from, to] of p.installs) cpSync(join(acme, "test/fixtures/evals", p.fixture, from), join(project.root, to));
        if (p.generate) expect(architect(project.root, "generate").status).toBe(0);
        const run = architect(project.root, "prove", "--env", "local", "--port", String(8871 + i));
        expect(run.status, run.stdout + run.stderr).toBe(1);
        expect(run.stdout.split("\n").some((l) => l.startsWith(p.line)), run.stdout).toBe(true);
        expect(run.stdout.trimEnd().split("\n").at(-1)).toMatch(/^prove ✘/);
        nothingRunning(project.root);
      } finally {
        project.remove();
      }
    }),
  );
});
