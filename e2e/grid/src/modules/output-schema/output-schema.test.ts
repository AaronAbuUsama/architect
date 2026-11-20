// An output schema is run, not looked at: the MCP SDK's own validator must accept the operation's answer and its refusals and refuse what is neither.
// The schemas below are planted: the one PR #153 shipped (a refusal's fields spread over the answer's, so an answer field named `status` became an
// integer), one that accepts anything, one that leaves the refusal out, and a correct `anyOf: [answer, refusal]`.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import type { OperationModel } from "../project-evidence/types.ts";
import { OutputSchema } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");

const refusalBranch = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };

// Acme's system.health answers `{ status: "ok" }`; acme has no captured run, so the run's own value is supplied as the span would carry it.
const health = acme.model.operations["system.health"]!;
const healthSpans = [{ name: "system.health", attrs: { "answer.status": "ok" } }];
const onHealth = (schema: unknown, spans: ReadonlyArray<{ name: string; attrs: Record<string, unknown> }> | undefined = healthSpans) => OutputSchema.answers({ model: acme.model, op: health, schema, spans });

/** What #153's output.ts built: the refusal's four properties spread over the answer's, so the later `status: integer` wins. */
const spreadOverAnswer = {
  type: "object", additionalProperties: true,
  properties: { ...{ status: { const: "ok" } }, ...refusalBranch.properties },
  anyOf: [{ required: ["status"] }, { required: ["refusal", "code", "exit", "status"] }],
};

describe("the false green of #153: a refusal's fields spread over an answer field named status", () => {
  it("is red: the answer { status: ok } fails its own schema", () => {
    const why = onHealth(spreadOverAnswer);
    expect(why).toHaveLength(1);
    expect(why[0]).toMatch(/^system\.health's output schema refuses its own answer {"status":"ok"}, so the SDK client rejects every successful call/);
  });

  it("is red even with no value from the run: the field shares a refusal's name, so the schema's own word for it is not taken", () => {
    expect(onHealth(spreadOverAnswer, [])).toEqual(["system.health's answer field status has a name a refusal also uses (refusal, code, exit, status) and the run recorded no value for it, so the schema cannot be shown to accept it"]);
  });

  it("is green as anyOf [answer, refusal]", () => {
    const right = { type: "object", anyOf: [{ type: "object", properties: { status: { const: "ok" } }, required: ["status"], additionalProperties: true }, refusalBranch] };
    expect(onHealth(right)).toEqual([]);
  });
});

describe("a schema that accepts anything is red", () => {
  it.each([["{}", {}], ["an object with no properties", { type: "object" }]])("%s", (_name, schema) => {
    expect(onHealth(schema)).toEqual(["system.health's output schema accepts {}, which is neither an answer nor a refusal, so it tells an agent nothing about what it gets back"]);
  });
});

describe("Plugged In's tools, with the output schema M1.42 emits (captured from #153's head on 20 November 2026)", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const onClaim = (schema: unknown, op: OperationModel = claim) => OutputSchema.answers({ model: pluggedIn.model, op, schema, spans: pluggedIn.spans });
  const emitted = (answer: Record<string, unknown>, required: ReadonlyArray<string>) => ({
    type: "object", additionalProperties: true, properties: { ...answer, ...refusalBranch.properties }, anyOf: [{ required }, { required: ["refusal", "code", "exit", "status"] }],
  });

  it("handle.claim's schema is green: it accepts { handle: hdl_… } and each refusal, refuses {}", () => {
    expect(onClaim(emitted({ handle: { type: "string" } }, ["handle"]))).toEqual([]);
  });

  it("profile.get's schema is green with a link list the model does not spell out", () => {
    const links = { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string", minLength: 1 }, url: { type: "string" } }, required: ["id", "title", "url"] } };
    expect(OutputSchema.answers({ model: pluggedIn.model, op: pluggedIn.model.operations["profile.get"]!, schema: emitted({ handle: { type: "string" }, links }, ["handle", "links"]), spans: pluggedIn.spans })).toEqual([]);
  });

  it("an answer field typed as an integer is red", () => {
    expect(onClaim(emitted({ handle: { type: "integer" } }, ["handle"]))[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"handle":"hdl_/);
  });

  it("an answer field that takes anything is red: its type is not the field's", () => {
    expect(onClaim(emitted({ handle: {} }, ["handle"]))).toEqual(["handle.claim's output schema accepts an object for the answer field handle, so its type is not the field's"]);
  });

  it("a schema with no branch for a refusal is red, naming the refusal", () => {
    const why = onClaim({ type: "object", properties: { handle: { type: "string" } }, required: ["handle"] });
    expect(why).toHaveLength(claim.refusals!.length);
    expect(why[0]).toBe(`handle.claim's output schema refuses the refusal {"refusal":"HandleTaken","code":"HN-001","exit":10,"status":400}, so the SDK client rejects every refused call`);
    expect(why.every((w) => w.includes("refuses the refusal"))).toBe(true);
  });

  it("a tool whose answer has no fields needs no schema", () => {
    expect(OutputSchema.answers({ model: pluggedIn.model, op: pluggedIn.model.operations["handle.release"]!, schema: undefined })).toEqual([]);
  });
});

describe("a state an answer carries", () => {
  const moved = { ...pluggedIn.model.operations["link.add"]!, answer: { link: pluggedIn.model.operations["link.add"]!.answer["link"]!, state: { value: { type: "schema" }, named: "LinkState" } } } as OperationModel;
  const states = ["listed", "removed"];
  const run = (schema: unknown) => OutputSchema.states({ model: pluggedIn.model, op: moved, schema, spans: pluggedIn.spans, states });
  const shape = (state: unknown) => ({ type: "object", properties: { link: { type: "string" }, state }, required: ["link", "state"] });

  it("the machine's states as an enum is green", () => {
    expect(run(shape({ enum: states }))).toEqual([]);
  });
  it("a state typed as any string is red", () => {
    expect(run(shape({ type: "string" }))).toEqual([`link.add's output schema accepts "not-a-state" as the state, so it does not type it as the machine's states`]);
  });
  it("an enum that leaves a state out is red", () => {
    expect(run(shape({ enum: ["listed"] }))).toEqual([`link.add's output schema refuses the answer with state "removed", which the machine declares`]);
  });
});
