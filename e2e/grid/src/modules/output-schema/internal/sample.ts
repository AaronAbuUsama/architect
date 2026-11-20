import { Effect } from "effect";
import type { FieldModel, OperationModel } from "../../project-evidence/types.ts";
import type { SpanView } from "../../refusal-evals/types.ts";

type Json = { readonly [key: string]: unknown };
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The names a refusal's structured content always carries; an answer field with one of them is the case a spread schema breaks. */
export const ENVELOPE = ["refusal", "code", "exit", "status"] as const;

/** A span attribute holds a list or an object as its JSON text; read it back as the value it was. */
const unflattened = (value: unknown): unknown => {
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
 * A text with more to it than a length: a key beyond `type` and `max`, or the length of `Values.email` (254), whose pattern the model does not record.
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

/** Kinds a wrong-typed value is certain to be refused by: a scalar. A named schema may be an object or an array, which `{}` could be. */
const scalar = (field: FieldModel, real: unknown): boolean => ["id", "text", "uint", "int", "boolean", "bool"].includes(field.value.type) || ["string", "number", "boolean"].includes(typeof real);

/** The constant an answer branch of an `anyOf` gives a field (`status: { const: "ok" }`): the branch that is not the refusal's own names it as the answer's. */
const answerConst = (schema: unknown, name: string): unknown => {
  if (!isObject(schema) || !Array.isArray(schema["anyOf"])) return undefined;
  const branches = (schema["anyOf"] as ReadonlyArray<unknown>).filter((b) => !(isObject(b) && Array.isArray(b["required"]) && ENVELOPE.every((n) => (b["required"] as ReadonlyArray<string>).includes(n))));
  const property = branches.map((b) => (isObject(b) && isObject(b["properties"]) ? b["properties"][name] : undefined)).find((p) => isObject(p) && ("const" in p || Array.isArray(p["enum"])));
  return isObject(property) ? ("const" in property ? property["const"] : (property["enum"] as ReadonlyArray<unknown>)[0]) : undefined;
};

/**
 * What every caller is shown of an answer: the fields with no visibility rule. A private field is optional and a secret is never named, so neither is in a
 * sample. A field the model declares optional is in the sample only when `withOptional` (a second sample, so both shapes are judged).
 */
const shown = (op: OperationModel, withOptional: boolean): ReadonlyArray<[string, FieldModel]> => Object.entries(op.answer).filter(([, f]) => f.visibility === undefined && (withOptional || f.optional !== true));

/** Does the operation's answer declare a public field that is optional? */
export const hasOptional = (op: OperationModel): boolean => shown(op, true).length > shown(op, false).length;

export interface Sample {
  /** The answer, field by field. */
  readonly answer: Readonly<Record<string, unknown>>;
  /** The fields no value could be found for: the run recorded none and the model does not say one. They are unjudged, never filled from the schema being judged. */
  readonly unknown: ReadonlyArray<string>;
  /** The fields a value of the wrong type is certain to be refused for. */
  readonly scalars: ReadonlyArray<string>;
  /** The numeric fields: a word that is no number must be refused for them too. */
  readonly numeric: ReadonlyArray<string>;
}

/** An answer the operation could give, from its declared fields: the model's value for what it determines, else the run's, else (a refusal's name only) the answer branch's own constant. */
export const sampleOf = (op: OperationModel, schema: unknown, spans: ReadonlyArray<SpanView> | undefined, withOptional = false): Sample => {
  const answer: Record<string, unknown> = {};
  const unknown: Array<string> = [];
  const scalars: Array<string> = [];
  const numeric: Array<string> = [];
  for (const [name, field] of shown(op, withOptional)) {
    const real = observed(spans, op.name, name, field);
    const known = NUMERIC.includes(field.value.type) ? fromModel(field) : (real ?? fromModel(field));
    const value = known ?? ((ENVELOPE as ReadonlyArray<string>).includes(name) ? answerConst(schema, name) : undefined);
    if (value === undefined) unknown.push(name);
    else answer[name] = value;
    if (scalar(field, known)) scalars.push(name);
    if (NUMERIC.includes(field.value.type)) numeric.push(name);
  }
  return { answer, unknown, scalars, numeric };
};
