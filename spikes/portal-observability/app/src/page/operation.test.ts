// The page is a pure function of the model and one telemetry answer. Fixture: 15 real `spend` traces from a local run
// (three of each outcome), captured from the Collector's files. Run: node --test src/page/operation.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Model, Telemetry } from "./model.ts";
import { operationPage } from "./operation.ts";
import { traceView } from "./trace.ts";

const model = JSON.parse(readFileSync(new URL("../../../../../examples/acme/generated/model/model.json", import.meta.url), "utf8")) as Model;
const telemetry = JSON.parse(readFileSync(new URL("../../fixtures/spend-window.json", import.meta.url), "utf8")) as Telemetry;

test("same inputs, same page; the inputs are not touched", () => {
  const before = JSON.stringify(telemetry);
  const a = operationPage(model, "allowance.spend", telemetry);
  const b = operationPage(model, "allowance.spend", structuredClone(telemetry));
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(telemetry), before);
});

test("every outcome is counted where it belongs", () => {
  const page = operationPage(model, "allowance.spend", telemetry)!;
  assert.equal(page.live.total, 15);
  const seen = Object.fromEntries(page.refusals.map((r) => [r.tag, r.count]));
  assert.deepEqual(seen, { AllowanceExceeded: 3, AllowanceNotActive: 3, NotAllowed: 3 });
  assert.equal(page.live.calls.filter((c) => c.replayed).length, 3);
  assert.equal(page.live.defects, 0);
});

test("NotAllowed is seen only at the door; the others carry what decided them", () => {
  const page = operationPage(model, "allowance.spend", telemetry)!;
  const byTag = Object.fromEntries(page.refusals.map((r) => [r.tag, r]));
  assert.equal(byTag["NotAllowed"]!.seenOnlyAtTheDoor, true);
  assert.equal(byTag["NotAllowed"]!.code, "AR-001");
  assert.equal(byTag["AllowanceExceeded"]!.lastLog, "the amount is more than is left");
  assert.equal(byTag["AllowanceNotActive"]!.code, "AL-900");
  assert.equal(byTag["AllowanceNotActive"]!.from, "machine");
});

test("docs come from the model: fields, move, event, steps, the commit O2 adds", () => {
  const page = operationPage(model, "allowance.spend", telemetry)!;
  assert.deepEqual(page.payload.map((f) => [f.name, f.type, f.untracedByO2]), [["allowance", "id<alw>", false], ["amount", "uint128", false], ["memo", "text ≤200", true]]);
  assert.deepEqual(page.move?.to, ["active", "exhausted"]);
  assert.equal(page.event?.name, "AllowanceSpent");
  assert.deepEqual(page.steps.map((s) => [s.key, s.planned]), [["load", false], ["record", false], ["commit", true]]);
  assert.equal(page.budgetMs, 150);
});

test("a refused call's waterfall: load ran, record didn't, the refusal is on the operation's span", () => {
  const page = operationPage(model, "allowance.spend", telemetry)!;
  const call = page.live.calls.find((c) => c.tag === "AllowanceExceeded")!;
  const view = traceView(model, call.trace, telemetry.traces[call.trace]!);
  const flat = (rows: typeof view.roots): Array<(typeof view.roots)[number]> => rows.flatMap((r) => [r, ...flat(r.children)]);
  const spans = flat(view.roots);
  const op = spans.find((s) => s.name === "allowance.spend")!;
  assert.equal(op.status, "refusal");
  assert.ok(op.children.some((s) => s.name === "allowance.spend.load"));
  assert.ok(!spans.some((s) => s.name === "allowance.spend.record"));
  assert.ok(view.logs.some((l) => l.body === "the amount is more than is left" && l.spanName === "allowance.spend"));
});
