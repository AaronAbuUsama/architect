// Check 32 (ST1.18, G5 "Prove"): `ortho prove` holds a project's invariants. On the check-25 fixture (`e2e/fixtures/m1/invariants`: a `handle` with `oneHolderPerName` and
// `oneNamePerPerson`, handlers that check nothing, and the journey "one name, one person" that reaches both refusals):
//  1. prove is green with its journey, so prove's world holds the rules (today a handler's `findBy` dies there; here the runtime refuses for the handler) and the refusal
//     evals read the runtime's deciding log;
//  2. the coverage line counts each rule's refusal once, however many operations can break the rule: a second breaker (`handle.rename` with `writes: [Handle]`) does not
//     change the refusals denominator, and the one journey on `handle.claim` still covers both;
//  3. with the journey removed prove fails and names each unreached rule by its full name (`handle.oneHolderPerName`, `handle.oneNamePerPerson`), not an operation.
// Real workerd, no Docker, a port from the OS. Written by the checks author; a builder never edits this file or the fixture.
// Red today on the missing surface (`Blueprint.invariant` is not a function): all three tests. The fixture compiling without its rules is check 25's control.
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { freePort } from "./clients.ts";
import { acme, copyOf, fixtures, run } from "./support.ts";

const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

const project = (edits: Readonly<Record<string, (text: string) => string>> = {}, without: ReadonlyArray<string> = []) => {
  const copy = copyOf(acme);
  copies.push(copy);
  cpSync(join(fixtures, "invariants"), copy.root, { recursive: true });
  for (const path of without) rmSync(join(copy.root, path), { force: true });
  for (const [path, edit] of Object.entries(edits)) writeFileSync(join(copy.root, path), edit(readFileSync(join(copy.root, path), "utf8")));
  return copy.root;
};
const prove = async (root: string) => run(root, "prove", "--env", "local", "--port", String(await freePort()));
const refusalsOf = (stdout: string) => {
  const m = /refusals (\d+)\/(\d+)/.exec(stdout);
  return m ? { covered: Number(m[1]), of: Number(m[2]) } : undefined;
};

describe("32 ST1.18: prove holds the rules", () => {
  it("is green with the fixture's journey, which refuses both rules, and its coverage line is full", { timeout: 600_000 }, async () => {
    const proved = await prove(project());
    expect(proved.status, proved.out).toBe(0);
    const lines = proved.stdout.trimEnd().split("\n");
    expect(lines.some((l) => /^journey one name, one person ✔ \d+\/\d+ steps$/.test(l)), proved.out).toBe(true);
    expect(proved.out, "no handler died on a lookup in prove's world").not.toMatch(/findBy|is not declared unique|Cannot read properties/);
    const refusals = refusalsOf(proved.stdout);
    expect(refusals, proved.out).toBeDefined();
    expect(refusals!.covered).toBe(refusals!.of);
    expect(refusals!.of, "HandleTaken and HandleAlreadyOwned, each once").toBeGreaterThanOrEqual(2);
    expect(lines.at(-1)).toBe("prove ✔");
  });

  it("counts a rule's refusal once, however many operations can break the rule", { timeout: 600_000 }, async () => {
    const base = refusalsOf((await prove(project())).stdout);
    const more = await prove(project({ "blueprint/things/handle/verbs/rename.ts": (t) => t.replace("steps: { update: Blueprint.step.database() }", "steps: { update: Blueprint.step.database({ writes: [Handle] }) }") }));
    expect(more.status, more.out).toBe(0);
    const withRename = refusalsOf(more.stdout);
    expect(base, "the base run has a refusals count").toBeDefined();
    expect(withRename, more.out).toEqual(base);
  });

  it("with the journey removed fails and names each unreached rule by its full name", { timeout: 600_000 }, async () => {
    const proved = await prove(project({}, ["journeys/one-name-one-person.ts"]));
    expect(proved.status, proved.out).not.toBe(0);
    expect(proved.out).toMatch(/handle\.oneHolderPerName/);
    expect(proved.out).toMatch(/handle\.oneNamePerPerson/);
    expect(proved.out, "the operation is not what is unreached").not.toMatch(/handle\.claim[^\n]*(unreached|not reached|uncovered)/i);
  });
});
