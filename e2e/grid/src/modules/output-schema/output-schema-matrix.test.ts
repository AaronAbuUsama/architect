// The matrix in README.md, cell by cell: each planted red names its row and column (`R3 x B`). A cell that is `n/a` there has its reason in the README.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import type { OperationModel } from "../project-evidence/types.ts";
import { OutputSchema } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const envelope = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };
const digits = { type: "string", pattern: "^-?\\d+$" };

/** An acme operation that answers `{ status: "ok" }` and can refuse with `refusal`; the schema has the answer, every other refusal as the bare envelope, and `branch` for `refusal`. */
const refusing = (refusal: string, branch: (base: typeof envelope) => unknown, model = acme.model, thing = "allowance") => {
  const op = { ...acme.model.operations["system.health"]!, refusals: [refusal], thing, move: null } as OperationModel;
  const answer = { type: "object", properties: { status: { const: "ok" } }, required: ["status"] };
  const others = { ...envelope, properties: { ...envelope.properties, refusal: { type: "string", not: { const: refusal } } } };
  return OutputSchema.answers({ model, op, spans: [{ name: "system.health", attrs: { "answer.status": "ok" } }], files: acme.files, schema: { type: "object", anyOf: [answer, others, branch(envelope)] } });
};
const only = (refusal: string, extra: Record<string, unknown>, required: ReadonlyArray<string>) => (base: typeof envelope) => ({ ...base, properties: { ...base.properties, refusal: { const: refusal }, ...extra }, required: [...base.required, ...required] });

describe("R3 declared refusal, every caller: B and D", () => {
  it("R3 x B and D: `remaining` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: {} }, ["remaining"]));
    expect(why).toEqual([`system.health's output schema accepts 1, 1.5, true, null, [], {"wrong":"type"} for the refusal field remaining, so its type is not the field's`].map((w) => w.replace("1, 1.5", '"not-a-number", "1.5", 1, 1.5')));
  });
  it("R3 x A, B, C: `remaining` typed as digits and required is green", () => {
    expect(refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits }, ["remaining"]))).toEqual([]);
  });
});

describe("R4 declared refusal, role-visible: B and D", () => {
  const allowance = acme.model.things["allowance"]!;
  const error = allowance.errors!["AllowanceExceeded"]!;
  const model = { ...acme.model, things: { ...acme.model.things, allowance: { ...allowance, errors: { ...allowance.errors, AllowanceExceeded: { ...error, fields: { ...error.fields, extra: { value: { type: "uint", bits: 32 }, optional: true, visibility: { private: ["allowance.grantee"] } } } } } } } };
  it("R4 x B and D: a role-private `extra` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits, extra: {} }, ["remaining"]), model);
    expect(why).toHaveLength(1);
    expect(why[0]).toMatch(/accepts .* for the refusal field extra, so its type is not the field's$/);
  });
  it("R4 x C is n/a (a private field may be absent) and R4 x E holds: the public shape omits `extra` and is accepted", () => {
    expect(refusing("AllowanceExceeded", only("AllowanceExceeded", { remaining: digits, extra: digits }, ["remaining"]), model)).toEqual([]);
  });
});

describe("R5 refusal envelope: D", () => {
  it("R5 x D: `code` typed as anything takes every wrong kind", () => {
    const why = refusing("AllowanceExceeded", (base) => ({ ...base, properties: { ...base.properties, code: {} } }));
    expect(why[0]).toMatch(/accepts .* for the refusal field code, so its type is not the field's$/);
  });
});

describe("R6 wrong-state refusal (`state`) and R7 not-found (`id`)", () => {
  const withState = (extra: Record<string, unknown>, required: ReadonlyArray<string>) => refusing("AllowanceNotActive", only("AllowanceNotActive", extra, required), acme.model, "allowance");
  it("R6 x A: a branch typing and requiring `state` is green", () => {
    expect(withState({ state: { type: "string" } }, ["state"])).toEqual([]);
  });
  it("R6 x B and D: `state` typed as anything is red", () => {
    expect(withState({ state: {} }, ["state"])[0]).toMatch(/accepts .* for the refusal field state, so its type is not the field's$/);
  });
  it("R6 x C: `state` typed but not required is red", () => {
    expect(withState({ state: { type: "string" } }, [])).toEqual(["system.health's output schema does not require the refusal field state of AllowanceNotActive: a refusal without it is accepted"]);
  });
  const notFound = acme.model.things["person"]!.notFound!.error;
  const withId = (extra: Record<string, unknown>, required: ReadonlyArray<string>) => refusing(notFound, only(notFound, extra, required), acme.model, "person");
  it("R7 x A: a branch typing and requiring `id` is green", () => {
    expect(withId({ id: { type: "string" } }, ["id"])).toEqual([]);
  });
  it("R7 x B and D: `id` typed as anything is red", () => {
    expect(withId({ id: {} }, ["id"])[0]).toMatch(/accepts .* for the refusal field id, so its type is not the field's$/);
  });
  it("R7 x C: `id` typed but not required is red", () => {
    expect(withId({ id: { type: "string" } }, [])).toEqual([`system.health's output schema does not require the refusal field id of ${notFound}: a refusal without it is accepted`]);
  });
});

describe("R8 answer state", () => {
  const moved = { ...pluggedIn.model.operations["handle.claim"]!, answer: { state: { value: { type: "text", max: 64 } } } } as OperationModel;
  const run = (state: unknown) => OutputSchema.states({ model: pluggedIn.model, op: moved, schema: { type: "object", anyOf: [{ type: "object", properties: { state }, required: ["state"] }, envelope] }, spans: [], files: pluggedIn.files, states: ["a", "b"] });
  it("R8 x A: the machine's states as an enum is green", () => {
    expect(run({ enum: ["a", "b"] })).toEqual([]);
  });
  it("R8 x B and D: a state typed as anything takes every wrong kind", () => {
    expect(run({})[0]).toMatch(/accepts .* as the state/);
  });
});
