import { describe, expect, it } from "vitest";
import type { Model, OperationModel } from "@architect/compiler";
import type { CallRecord } from "#modules/journeys/types.ts";
import type { Evidence } from "./types.ts";
import { performance, coverage } from "./internal/run.ts";
import { declaredErrors, whoMayCall } from "./internal/calls.ts";

const op = {
  name: "allowance.grant", thing: "allowance", verb: "grant", answer: {}, payload: { organization: { value: { type: "id", prefix: "org" } } },
  move: null, errors: ["AllowanceLimitTooHigh"], refusals: ["AllowanceLimitTooHigh", "NotAllowed"],
  allowed: [{ kind: "role-of", role: "organization.owner", path: "organization" }], steps: {}, budget: { p95Ms: 200 },
} as unknown as OperationModel;

const call = (over: Partial<CallRecord>): CallRecord => ({
  journey: "grant an allowance", step: "s", actor: "bob", person: "per_b", operation: "allowance.grant", payload: { organization: "org_1" },
  status: 200, body: {}, trace: "t", parent: "p", mayCall: true, journal: [], ...over,
});
const evidence = (ms: number, over: Partial<Evidence> = {}): Evidence => ({
  call: call({}), trace: { spans: [], logs: [] }, refusal: undefined, stored: undefined,
  opSpan: { traceId: "t", spanId: "s", parentSpanId: "p", name: "allowance.grant", attrs: {}, status: 1, ms }, ...over,
});

describe("evals on evidence", () => {
  it("performance: slow evidence raises a review and never fails", () => {
    const v = performance(op, [evidence(10), evidence(400)], undefined as never);
    expect(v.failures).toEqual([]);
    expect(v.notes).toEqual(["p50 10ms p95 400ms budget p95 200ms", "review: p95 400ms is over 1.5x budget"]);
  });

  it("declared errors: an undeclared refusal names itself and the declared ones", () => {
    const v = declaredErrors(op, [evidence(1, { refusal: "Boom" })], undefined as never);
    expect(v.failures).toEqual(['grant-an-allowance "s": refused with Boom, not one of AllowanceLimitTooHigh, NotAllowed']);
  });

  it("who may call: judged on mayCall, not on what the server said", () => {
    const answered = whoMayCall(op, [evidence(1, { call: call({ mayCall: false }) })], undefined as never);
    expect(answered.failures[0]).toContain("caller bob (person per_b) lacks owner of organization org_1, and was answered, not refused");
    const refusedWrongly = whoMayCall(op, [evidence(1, { refusal: "NotAllowed", call: call({ status: 403 }) })], undefined as never);
    expect(refusedWrongly.failures[0]).toContain("was refused NotAllowed");
    expect(whoMayCall(op, [evidence(1, { refusal: "NotAllowed", call: call({ mayCall: false, status: 403 }) })], undefined as never).failures).toEqual([]);
  });

  it("coverage: an operation no journey reaches fails, and the counts say by how much", () => {
    const model = { operations: { "allowance.grant": op, "organization.rename": { ...op, name: "organization.rename", errors: [], refusals: ["NotAllowed"] } } } as unknown as Model;
    const v = coverage(model, [evidence(1, { refusal: "AllowanceLimitTooHigh" })]);
    expect(v.failures).toEqual(["organization.rename reached by no journey"]);
    expect(v.notes[0]).toMatch(/^operations 1\/2 /);
  });
});
