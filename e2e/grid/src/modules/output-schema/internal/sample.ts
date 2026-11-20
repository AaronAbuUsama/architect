import { Effect } from "effect";
import type { FieldModel, OperationModel } from "../../project-evidence/types.ts";
import type { SpanView } from "../../refusal-evals/types.ts";

type Json = { readonly [key: string]: unknown };
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The names a refusal's structured content always carries; an answer field with one of them is the case a spread schema breaks. */
export const ENVELOPE = ["refusal", "code", "exit", "status"] as const;

/** A span attribute holds a list, an object or `null` as its JSON text; read it back as the value it was. */
const unflattened = (value: unknown): unknown => {
  if (value === "null") return null;
  if (typeof value !== "string" || !/^\s*[[{]/.test(value)) return value;
  return Effect.runSync(Effect.try(() => JSON.parse(value) as unknown).pipe(Effect.orElseSucceed(() => value)));
};

/** A real value of the answer field `name`: the one the operation's span in the prove run recorded. */
const observed = (spans: ReadonlyArray<SpanView> | undefined, op: string, name: string, field: FieldModel): unknown => {
  const value = (spans ?? []).filter((s) => s.name === op).map((s) => s.attrs[`answer.${name}`]).find((v) => v !== undefined);
  // Text that happens to look like JSON (`"[1]"`) is still text: only a value the model does not say is a scalar is read back.
  return ["text", "id", "boolean", "bool", "uint", "int"].includes(field.value.type) ? value : unflattened(value);
};

/**
 * A text with more to it than a length: a key beyond `type` and `max`, or the length of `Values.email` (254), whose pattern the model does not record (S-28, `design/goals/03-snags.md`: the stopgap is deleted when the model records a value's pattern).
 * "x" may not be a value of it, so with no recorded value it is unjudged rather than red for a value that cannot occur.
 */
const constrained = (field: FieldModel): boolean => Object.keys(field.value).some((k) => k !== "type" && k !== "max") || field.value["max"] === 254;

/**
 * A value of the kinds the model fully determines, as the wire carries it: an id of its prefix, a text, a boolean, and a number as the text of its digits
 * (`Values.uint` decodes `BigIntFromString`). Anything else (a named schema) the model does not say.
 */
export const fromModel = (field: FieldModel): unknown =>
  field.value.type === "id" ? `${String(field.value["prefix"] ?? "id")}_abc123`
  : field.value.type === "text" ? (constrained(field) ? undefined : "x")
  : field.value.type === "uint" ? "1"
  : field.value.type === "int" ? "0"
  : field.value.type === "boolean" || field.value.type === "bool" ? true
  : undefined;

const NUMERIC = ["uint", "int"];

/** How a value travels in JSON: text, a JSON integer, a boolean, or a number as the text of its digits (`Values.uint` decodes `BigIntFromString`). */
export type Kind = "string" | "integer" | "boolean" | "digits";

/**
 * Every JSON kind a value of `kind` is not, each of which a schema that types the field must refuse: the other scalars (a number is not text, a fractional
 * number is not an integer, digits are not a number), null, an array and an object. A wider type (`["string", "number"]`) accepts one of them and is red.
 */
export const wrongValues = (kind: Kind): ReadonlyArray<unknown> => {
  const others: ReadonlyArray<unknown> = [null, [], { wrong: "type" }];
  return kind === "string" ? [1, 1.5, true, ...others]
    : kind === "integer" ? ["x", "1", 1.5, true, ...others]
    : kind === "boolean" ? ["x", 1, 1.5, ...others]
    : ["not-a-number", "1.5", 1, 1.5, true, ...others];
};

const kindOf = (field: FieldModel): Kind | undefined =>
  field.value.type === "id" || field.value.type === "text" ? "string"
  : field.value.type === "uint" || field.value.type === "int" ? "digits"
  : field.value.type === "boolean" || field.value.type === "bool" ? "boolean"
  : undefined;

/** Every JSON kind a recorded value is not: the other scalars, null, an array and an object. */
const kindsNot = (value: unknown): ReadonlyArray<unknown> =>
  typeof value === "string" ? [1, 1.5, true, null, [], { wrong: "type" }]
  : typeof value === "number" ? ["x", true, null, [], { wrong: "type" }]
  : typeof value === "boolean" ? ["x", 1, null, [], { wrong: "type" }]
  : Array.isArray(value) ? ["x", 1, true, null, { wrong: "type" }]
  : isObject(value) ? ["x", 1, true, null, []]
  : [];

/**
 * Every way a recorded value can be wrong, from the value's own shape: each kind it is not; for an array, an item of each wrong kind and an item missing each key
 * every recorded item has; for an object, each key dropped and each key given a wrong value (recursively). A schema typing the value loosely accepts one of them.
 * A recorded null says nothing of what else is allowed (a nullable cursor), so it gives none.
 */
const mutations = (value: unknown): ReadonlyArray<unknown> => {
  if (Array.isArray(value)) return [...kindsNot(value), ...(value.length === 0 ? [] : mutations(value[0]).map((item) => [item]))];
  if (isObject(value)) return [...kindsNot(value), ...Object.keys(value).flatMap((key) => [Object.fromEntries(Object.entries(value).filter(([k]) => k !== key)), ...mutations(value[key]).map((v) => ({ ...value, [key]: v }))])];
  return kindsNot(value);
};

/** The values a field must refuse: every other JSON kind where the model types it; for a named schema, what its recorded value's own shape gives. */
export const probesOf = (field: FieldModel, known: unknown): ReadonlyArray<unknown> => {
  const kind = kindOf(field);
  return kind !== undefined ? wrongValues(kind) : mutations(known);
};

/**
 * What an answer shows: the fields every caller sees, and nothing secret (a secret never leaves through MCP). The fuller sample (`withMore`) also has the fields
 * the model declares optional and the ones private to roles, which a caller holding a role does receive (`Visibility.sees`), so both shapes are judged.
 */
const shown = (op: OperationModel, withMore: boolean): ReadonlyArray<[string, FieldModel]> =>
  Object.entries(op.answer).filter(([, f]) => f.visibility !== "secret" && (withMore || (f.visibility === undefined && f.optional !== true)));

/** Does the operation's answer declare a field that only the fuller sample carries: an optional one, or one private to roles? */
export const hasOptional = (op: OperationModel): boolean => shown(op, true).length > shown(op, false).length;

export interface Sample {
  /** The answer, field by field. */
  readonly answer: Readonly<Record<string, unknown>>;
  /** The fields no value could be found for: the run recorded none and the model does not say one. They are unjudged, never filled from the schema being judged. */
  readonly unknown: ReadonlyArray<string>;
  /** The values each field must be refused, by field: every JSON kind its type is not. */
  readonly probes: Readonly<Record<string, ReadonlyArray<unknown>>>;
}

/** An answer the operation could give, from its declared fields: the model's value for what it determines, else the run's; a field with neither is unjudged, never filled from the schema being judged. */
export const sampleOf = (op: OperationModel, spans: ReadonlyArray<SpanView> | undefined, withMore = false): Sample => {
  const answer: Record<string, unknown> = {};
  const unknown: Array<string> = [];
  const probes: Record<string, ReadonlyArray<unknown>> = {};
  for (const [name, field] of shown(op, withMore)) {
    const real = observed(spans, op.name, name, field);
    const known = NUMERIC.includes(field.value.type) ? fromModel(field) : (real !== undefined ? real : fromModel(field));
    const value = known;
    if (value === undefined) unknown.push(name);
    else answer[name] = value;
    probes[name] = probesOf(field, known);
  }
  return { answer, unknown, probes };
};
