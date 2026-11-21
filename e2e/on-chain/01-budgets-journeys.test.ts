// Goal 4's done check, first line (`design/goals/04-on-chain.md`, "The done check": every `examples/budgets` journey is green in `local`).
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
//
// WHAT IS REQUIRED. On a fresh copy of `examples/budgets`, `ortho prove --env local` runs the whole project and
// - exits 0 and writes a report that says the run passed;
// - ran exactly the seven journeys of `examples/budgets/journeys/README.md` (the names in support.ts, which `declared()` ties to the journeys
//   folder), each with all its steps green: 7 journeys, 26 steps, none stopped;
// - leaves nothing of the copy running (prove runs in a process group of its own; the group and every descendant seen are stopped afterwards,
//   and the check asserts none is left, as stage 1's does).
// It reads prove's own report (`--report`, schemaVersion 1), never its prose. When prove cannot even load the project, there is no report,
// and the failure is prove's own message, which names the journey or the compile problem.
//
// WHO SIGNED (snag S-11, the lead's answer): prove's report gives each journey a `cast: { <name>: { account } }` (CAIP-10, one account per
// actor) and each step that runs an operation an `actor` and `signer: { actor, account }`. The check requires, for every step, that
// signer.actor is the step's actor and signer.account is that actor's account in the cast; a step without a signer fails naming the journey
// and the step. The field names are the lead's; `actor` on the step and `cast` on the journey are this check's reading of "the report's cast".
//
// THE CONTROLS plant each hollow reading against `journeyProblems`: a missing journey, an extra one, a repeated one, a short or long step
// count, a red step, and a journey that ran no step. Each must be refused.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { copyOf } from "../layer1/support.ts";
import { JOURNEYS, STEPS, budgets, declared, journeyProblems, leftRunning, plain, proveOnce, signerProblems, type ReportedJourney } from "./support.ts";

const reports = mkdtempSync(join(tmpdir(), "ortho-on-chain-"));
const copies: Array<ReturnType<typeof copyOf>> = [];
afterEach(async () => {
  const roots = copies.splice(0);
  for (const copy of roots) { const left = await leftRunning(copy.root); copy.remove(); expect(left, "something of the copy is still running").toEqual([]); }
});

describe("the journeys folder and the expectation agree", () => {
  it("budgets declares exactly as many journeys as the check expects", () => {
    expect(declared().length).toBe(Object.keys(JOURNEYS).length);
    expect(STEPS).toBe(26);
  });
});

describe("controls: journeyProblems refuses each hollow reading", () => {
  const good = Object.entries(JOURNEYS).map(([name, total]) => ({ name, green: total, total }));
  it("accepts the real thing", () => expect(journeyProblems(good)).toEqual([]));
  it("refuses a missing, an extra and a repeated journey", () => {
    expect(journeyProblems(good.slice(1))).not.toEqual([]);
    expect(journeyProblems([...good, { name: "something else", green: 1, total: 1 }])).not.toEqual([]);
    expect(journeyProblems([...good, good[0]!])).not.toEqual([]);
  });
  it("refuses a short count, a long count, a red step, and a journey that ran no step", () => {
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total - 1, total: j.total - 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total + 1, total: j.total + 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: j.total - 1 } : j))).not.toEqual([]);
    expect(journeyProblems(good.map((j, i) => i === 0 ? { ...j, green: 0, total: 0 } : j))).not.toEqual([]);
  });
});

describe("controls: signerProblems refuses each wrong signer", () => {
  const good = (): ReportedJourney[] => [{
    name: "j",
    cast: { olga: { account: "eip155:31337:0xaa" }, bob: { account: "eip155:31337:0xbb" } },
    steps: [
      { name: "olga spends", verdict: "pass", actor: "olga", signer: { actor: "olga", account: "eip155:31337:0xaa" } },
      { name: "bob tries", verdict: "pass", actor: "bob", signer: { actor: "bob", account: "eip155:31337:0xbb" } },
    ],
  }];
  const plant = (f: (j: ReportedJourney[]) => ReportedJourney[]) => signerProblems(f(good()));
  const step = (j: ReportedJourney[], i: number, patch: object): ReportedJourney[] => [{ ...j[0]!, steps: j[0]!.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) }];
  it("accepts every step signed by its own actor's account", () => expect(signerProblems(good())).toEqual([]));
  it("refuses a step signed by another actor's account, naming journey and step", () => {
    const p = plant((j) => step(j, 0, { signer: { actor: "olga", account: "eip155:31337:0xbb" } }));
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('journey "j", step 1 (olga spends)');
  });
  it("refuses a step signed by another actor, even with the right account", () => expect(plant((j) => step(j, 1, { signer: { actor: "olga", account: "eip155:31337:0xbb" } }))).toHaveLength(1));
  it("refuses a missing signer, a missing actor, an empty or wrong-typed account", () => {
    expect(plant((j) => step(j, 1, { signer: undefined }))).toEqual(['journey "j", step 2 (bob tries): no `signer` in the report']);
    expect(plant((j) => step(j, 0, { actor: undefined }))).toHaveLength(1);
    expect(plant((j) => step(j, 0, { signer: { actor: "olga" } }))).toHaveLength(1);
    expect(plant((j) => step(j, 0, { signer: { actor: "olga", account: "" } }))).toHaveLength(1);
  });
  it("refuses a right actor with a wrong account", () => expect(plant((j) => step(j, 0, { signer: { actor: "olga", account: "eip155:31337:0xcc" } }))).toHaveLength(1));
  it("refuses a cast with no accounts, an actor without one, and two actors on one account", () => {
    expect(signerProblems([{ ...good()[0]!, cast: undefined }]).length).toBeGreaterThan(0);
    expect(plant((j) => [{ ...j[0]!, cast: { olga: { account: "eip155:31337:0xaa" }, bob: {} } }]).length).toBeGreaterThan(0);
    expect(plant((j) => [{ ...j[0]!, cast: { olga: { account: "eip155:31337:0xaa" }, bob: { account: "eip155:31337:0xaa" } } }]).length).toBeGreaterThan(0);
  });
  it("judges every journey and every step, not the first", () => {
    const two = [...good(), { ...good()[0]!, name: "k" }];
    expect(signerProblems([two[0]!, { ...two[1]!, steps: two[1]!.steps.map((s, i) => (i === 1 ? { ...s, signer: undefined } : s)) }])).toEqual(['journey "k", step 2 (bob tries): no `signer` in the report']);
  });
});

describe("--env local", () => {
  it("every budgets journey is green: 7 journeys, 26 steps, read from prove's report", { timeout: 660_000 }, async () => {
    const copy = copyOf(budgets);
    copies.push(copy);
    const ended = await proveOnce(copy.root, ["--env", "local"], { hardStopSeconds: 600, report: join(reports, "local.json") });
    const out = plain(ended.out);
    expect(ended.hung, "prove still running at the hard stop").toBe(false);
    expect(ended.report, `ortho prove could not run examples/budgets in local (exit ${ended.status}); prove said:\n${out.slice(-3000)}`).toBeDefined();
    const report = ended.report as { schemaVersion: number; passed: boolean; totals: Record<string, number>; journeys: Array<ReportedJourney & { stopped?: string }> };
    expect(report.schemaVersion).toBe(1);
    const seen = report.journeys.map((j) => ({ name: j.name, green: j.steps.filter((s) => s.verdict === "pass").length, total: j.steps.length }));
    const problems = [
      ...journeyProblems(seen),
      ...signerProblems(report.journeys),
      ...report.journeys.filter((j) => j.stopped !== undefined).map((j) => `journey "${j.name}" stopped: ${j.stopped}`),
      ...(report.totals["journeys"] === Object.keys(JOURNEYS).length && report.totals["steps"] === STEPS ? [] : [`totals say ${report.totals["journeys"]} journeys, ${report.totals["steps"]} steps; expected ${Object.keys(JOURNEYS).length}, ${STEPS}`]),
      ...(report.totals["stepsPassed"] === STEPS && report.totals["journeysPassed"] === Object.keys(JOURNEYS).length ? [] : [`${report.totals["stepsPassed"]} steps and ${report.totals["journeysPassed"]} journeys passed`]),
      ...(report.passed ? [] : ["the report says the run did not pass"]),
      ...(ended.status === 0 ? [] : [`exit status ${ended.status}`]),
    ];
    expect(problems, `${problems.join("\n")}\n--- prove said (tail):\n${out.slice(-2500)}`).toEqual([]);
    console.log(`local: ${seen.filter((j) => j.green === j.total).length}/${seen.length} journeys, ${report.totals["stepsPassed"]}/${report.totals["steps"]} steps, ${ended.seconds.toFixed(1)} s`);
  });
});
