// The SDK's types judged by what they resolve to. The real file is what the generator writes for Plugged In's link (M1.42); each attack is that file with one thing changed.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import { SdkTypes } from "./service.ts";
import { LINK_TYPES as REAL } from "./testing.ts";

const pluggedIn = await evidenceOf("plugged-in");
const link = pluggedIn.model.things["link"]!;
const path = "generated/sdk/src/link/types.ts";



const judged = (text: string, model = pluggedIn.model) => {
  const files = { ...pluggedIn.files, [path]: text };
  const input = { files, model, thing: model.things["link"]!, path };
  return { fields: SdkTypes.fieldProblems(input), state: SdkTypes.stateProblems({ ...input, states: ["listed", "removed"] }) };
};
const change = (from: string, to: string) => REAL.replace(from, to);
const OF = "type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;";

describe("the real file", () => {
  it("is green: every member resolves to what the model says, and the state is exactly the machine's", () => {
    expect(judged(REAL)).toEqual({ fields: [], state: [] });
  });
});

describe("a tampered helper type makes every member that uses it resolve wrong", () => {
  it.each([
    ["Of<F> = never", change(OF, "type Of<F> = never;")],
    ["Of<F> = F", change(OF, "type Of<F> = F;")],
    ["Declared = any", change(/type Declared = .*;/.exec(REAL)![0], "type Declared = any;")],
  ])("red: %s", (_name, text) => {
    const { fields } = judged(text);
    expect(fields.length).toBe(5);
    expect(fields[0]).toMatch(/^generated\/sdk\/src\/link\/types\.ts's Link\.id /);
  });
});

describe("a member typed as something that holds no usable value", () => {
  const member = (type: string, field = "title") => change(`readonly "${field}": Of<Declared["${field}"]>;`, `readonly "${field}": ${type};`);
  it.each(["Record<string, unknown>", "Number", "String", "string | Promise<void>", "any", "unknown", "never", "undefined", "string[]", "string | null", "{}", "object", "number", "true", "() => string"])("red: title typed %s", (type) => {
    expect(judged(member(type)).fields, type).toHaveLength(1);
  });
  it("red: an index signature on the type", () => {
    expect(judged(change('readonly "state": LinkState;', 'readonly "state": LinkState; readonly [key: string]: unknown;')).fields[0]).toMatch(/has an index signature/);
  });
  it("green: a string, a string literal union, or a bigint-free primitive spelled out", () => {
    expect(judged(member("string")).fields).toEqual([]);
    expect(judged(member('"a" | "b"')).fields).toEqual([]);
  });
});

describe("optionality matches the model", () => {
  const field = "title";
  const optional = { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, fields: { ...link.fields, [field]: { ...link.fields[field]!, optional: true } } } } };
  it("red: a required field written optional or with undefined", () => {
    expect(judged(change('readonly "title": Of', 'readonly "title"?: Of')).fields).toEqual([`${path}'s Link.title is optional or may be undefined, but every call carries it`]);
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title": Of<Declared["title"]> | undefined;')).fields).toEqual([`${path}'s Link.title is optional or may be undefined, but every call carries it`]);
  });
  it("red: an optional field spelled out as required; green: spelled optional", () => {
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title": string;'), optional).fields).toEqual([`${path}'s Link.title is not optional, but the model says a call may leave it out`]);
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title"?: string;'), optional).fields).toEqual([]);
  });
  it("green: a derived type follows the declaration's own optionality", () => {
    expect(judged(REAL, optional).fields).toEqual([]);
  });
});

describe("the thing's state is exactly the machine's states", () => {
  it.each([
    ["string", 'readonly "state": string;'],
    ["a derived type", 'readonly "state": Of<Declared["state"]>;'],
    ["another type", 'readonly "state": LinkAdded;'],
    ["one state", 'readonly "state": "listed";'],
    ["an extra literal", 'readonly "state": LinkState | "ghost";'],
    ["optional", 'readonly "state": LinkState | undefined;'],
  ])("red: Link.state as %s, while LinkState stays exact", (_name, line) => {
    const { state } = judged(change('readonly "state": LinkState;', line));
    expect(state.length).toBeGreaterThan(0);
    expect(state[0]).toMatch(/^generated\/sdk\/src\/link\/types\.ts's Link\.state resolves to /);
  });
  it("red: an exported LinkState with a value that is not a state, even when Link.state is exact", () => {
    expect(judged(change('"listed" | "removed";', '"listed" | "removed" | number;')).state.some((w) => /LinkState resolves to/.test(w))).toBe(true);
  });
  it("red: no state member at all", () => {
    expect(judged(change('  readonly "state": LinkState;\n', '')).state).toEqual([`${path}'s Link has no state member: a caller's state is not typed`]);
  });
});
