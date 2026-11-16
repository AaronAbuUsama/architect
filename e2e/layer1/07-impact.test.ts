// Check 7: after a prove, impact names exactly what a change unproves: a looser spend budget makes spend stale and
// nothing else; a new read is unproven, and nothing is stale.
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { acme, architect, copyOf, nothingRunning } from "./support.ts";

const project = copyOf(acme);
afterAll(project.remove);

describe("check 7: architect impact", () => {
  it("stale exactly allowance.spend after its budget is loosened; allowance.list unproven once added", () => {
    const { root } = project;
    expect(architect(root, "prove", "--env", "local", "--port", "8886").status).toBe(0);
    expect(architect(root, "impact").stdout).toMatch(/^stale none$/m);

    const spend = join(root, "blueprint/things/allowance/verbs/spend.ts");
    const declared = readFileSync(spend, "utf8");
    writeFileSync(spend, declared.replace('budget: { p95: "150 millis" }', 'budget: { p95: "300 millis" }'));
    const looser = architect(root, "impact").stdout.split("\n");
    expect(looser).toContain("changed operation allowance.spend: budget");
    expect(looser).toContain("stale allowance.spend");

    writeFileSync(spend, declared);
    cpSync(join(root, "blueprint/things/allowance/verbs/get.ts"), join(root, "blueprint/things/allowance/verbs/list.ts"));
    const added = architect(root, "impact").stdout.split("\n");
    expect(added).toContain("added operation allowance.list");
    expect(added).toContain("stale none");
    expect(added).toContain("unproven allowance.list");
    nothingRunning(root);
  });
});
