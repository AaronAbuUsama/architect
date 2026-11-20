// The output schema's types are judged by every JSON kind they must refuse, by which fields are required, and by a recorded null (PR #154's later rounds).
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import type { OperationModel } from "../project-evidence/types.ts";
import { OutputSchema } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const refusalBranch = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };

describe("every JSON kind a field's type is not must be refused", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const run = (handle: unknown, refusal: Record<string, unknown> = {}) => OutputSchema.answers({
    model: pluggedIn.model, op: claim, spans: pluggedIn.spans, files: pluggedIn.files,
    schema: { type: "object", anyOf: [{ type: "object", properties: { handle }, required: ["handle"] }, { ...refusalBranch, properties: { ...refusalBranch.properties, ...refusal } }] },
  });

  it("green: an id typed string, and a refusal typed as the envelope is", () => {
    expect(run({ type: "string" })).toEqual([]);
  });
  it("red: handle typed [string, number]", () => {
    expect(run({ type: ["string", "number"] })).toEqual([`handle.claim's output schema accepts 1, 1.5 for the answer field handle, so its type is not the field's`]);
  });
  it("red: handle typed nullable when the model's field is not", () => {
    expect(run({ type: ["string", "null"] })).toEqual([`handle.claim's output schema accepts null for the answer field handle, so its type is not the field's`]);
  });
  it("red: the refusal's exit typed as a number, which takes 1.5", () => {
    expect(run({ type: "string" }, { exit: { type: "number" } })).toEqual([`handle.claim's output schema accepts 1.5 for the refusal field exit, so its type is not the field's`]);
  });
  it("red: the refusal's code typed as a string or number", () => {
    expect(run({ type: "string" }, { code: { type: ["string", "number"] } })).toEqual([`handle.claim's output schema accepts 1, 1.5 for the refusal field code, so its type is not the field's`]);
  });
});

describe("every field every answer has must be required", () => {
  const profile = pluggedIn.model.operations["profile.get"]!;
  const links = { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, url: { type: "string" } }, required: ["id", "title", "url"] } };
  const schema = (required: ReadonlyArray<string>) => ({ type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" }, links }, required }, refusalBranch] });
  const run = (required: ReadonlyArray<string>) => OutputSchema.answers({ model: pluggedIn.model, op: profile, schema: schema(required), spans: pluggedIn.spans, files: pluggedIn.files });

  it("red: profile.get's schema requires only handle, so an answer without links is accepted", () => {
    expect(run(["handle"])).toEqual(["profile.get's output schema does not require the answer field links: an answer without it is accepted"]);
  });
  it("green: it requires both", () => {
    expect(run(["handle", "links"])).toEqual([]);
  });
});

describe("a recorded null is null", () => {
  const claim = pluggedIn.model.operations["handle.claim"]!;
  const page = { ...claim, answer: { next: { value: { type: "schema" }, named: "Cursor" } } } as OperationModel;
  const spans = [{ name: "handle.claim", attrs: { "answer.next": "null" } }];
  const schemaOf = (next: unknown) => ({ type: "object", anyOf: [{ type: "object", properties: { next }, required: ["next"] }, refusalBranch] });
  const run = (next: unknown) => OutputSchema.answers({ model: pluggedIn.model, op: page, schema: schemaOf(next), spans, files: pluggedIn.files });

  it("red: a string-only cursor on a final page, which answers next: null", () => {
    expect(run({ type: "string" })[0]).toMatch(/^handle\.claim's output schema refuses its own answer {"next":null}/);
  });
  it("green: a nullable cursor", () => {
    expect(run({ type: ["string", "null"] })).toEqual([]);
  });
});
