import { expect, it } from "vitest";
import type { CallRecord, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";
import { journeyLines } from "./report.ts";

const step: StepResult = {
  journey: "spend an allowance", title: "a stranger tries to spend", trace: "refused-call", failures: [],
  spans: { present: [], absent: ["allowance.spend"] },
};
const refused: CallRecord = {
  journey: step.journey, step: step.title, actor: "bob", person: "per_bob", operation: "allowance.spend",
  payload: {}, status: 403, body: { _tag: "NotAllowed" }, trace: step.trace, parent: "journey", mayCall: false, journal: [],
};
const missing: Trace = { spans: [], logs: [] };

const check = (call: CallRecord, spans = step.spans, trace = missing) =>
  journeyLines([{ name: step.journey, stopped: undefined, steps: [{ ...step, spans }], calls: [call] }], new Map([[step.trace, trace]]));

it("allows an empty trace for a matching access refusal predicted from world facts", () => {
  expect(check(refused).failed).toBe(0);
});

it("still needs telemetry for other calls", () => {
  for (const call of [
    { ...refused, mayCall: true },
    { ...refused, status: 200, body: {} },
    { ...refused, body: { _tag: "AnotherRefusal" } },
    { ...refused, trace: "another-call" },
  ]) expect(check(call).lines).toContain(`  ✘ "${step.title}": telemetry missing: no span of this call reached the collector`);
});

it("keeps explicit span assertions for an access refusal", () => {
  expect(check(refused, { present: ["allowance.spend"], absent: [] }).failed).toBe(1);
  const trace: Trace = {
    ...missing,
    spans: [{ traceId: step.trace, spanId: "unexpected", parentSpanId: "journey", name: "allowance.spend", attrs: {}, status: 0, ms: 1, start: 1 }],
  };
  expect(check(refused, step.spans, trace).lines).toContain(`  ✘ "${step.title}": span allowance.spend present, expected absent`);
});
