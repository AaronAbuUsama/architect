import { Effect } from "effect";
import type { FieldModel, OperationModel } from "../../project-evidence/types.ts";
import type { SpanView } from "../../refusal-evals/types.ts";

type Json = { readonly [key: string]: unknown };
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/** The names a refusal's structured content always carries; an answer field with one of them is the case a spread schema breaks. */
export const ENVELOPE = ["refusal", "code", "exit", "status"] as const;

/** The property schema `name` has in a schema, looking into the branches of `anyOf`, `oneOf` and `allOf`. */
const propertyOf = (schema: unknown, name: string): unknown => {
  if (!isObject(schema)) return undefined;
  const own = isObject(schema["properties"]) ? schema["properties"][name] : undefined;
  if (own !== undefined) return own;
  return (["anyOf", "oneOf", "allOf"] as const).flatMap((key) => (Array.isArray(schema[key]) ? (schema[key] as ReadonlyArray<unknown>) : [])).map((branch) => propertyOf(branch, name)).find((p) => p !== undefined);
};

/** The smallest value a JSON Schema accepts, as far as its own words say: a constant, a choice, a type with its bounds, an object's required properties. */
export const valueOf = (schema: unknown, depth = 0): unknown => {
  if (!isObject(schema) || depth > 6) return undefined;
  if ("const" in schema) return schema["const"];
  if (Array.isArray(schema["enum"])) return schema["enum"][0];
  if (Array.isArray(schema["anyOf"]) && schema["anyOf"].length > 0) return valueOf(schema["anyOf"][0], depth + 1);
  const type = Array.isArray(schema["type"]) ? schema["type"][0] : schema["type"];
  if (type === "string") return "x".repeat(typeof schema["minLength"] === "number" ? Math.max(1, schema["minLength"]) : 1);
  if (type === "integer" || type === "number") return typeof schema["minimum"] === "number" ? schema["minimum"] : 1;
  if (type === "boolean") return true;
  if (type === "array") return [];
  if (type === "object" || isObject(schema["properties"])) {
    const required = Array.isArray(schema["required"]) ? (schema["required"] as ReadonlyArray<string>) : [];
    return Object.fromEntries(required.map((key) => [key, valueOf(propertyOf(schema, key), depth + 1)]));
  }
  return undefined;
};

/** A span attribute holds a list or an object as its JSON text; read it back as the value it was. */
const unflattened = (value: unknown): unknown => {
  if (typeof value !== "string" || !/^\s*[[{]/.test(value)) return value;
  return Effect.runSync(Effect.try(() => JSON.parse(value) as unknown).pipe(Effect.orElseSucceed(() => value)));
};

/** A real value of the answer field `name`: the one the operation's span in the prove run recorded. */
const observed = (spans: ReadonlyArray<SpanView> | undefined, op: string, name: string): unknown =>
  unflattened((spans ?? []).filter((s) => s.name === op).map((s) => s.attrs[`answer.${name}`]).find((v) => v !== undefined));

/** A value of the kinds the model fully determines: an id of its prefix, a text, a boolean. Anything else (a named schema, a number's wire form) the model does not say. */
const fromModel = (field: FieldModel): unknown =>
  field.value.type === "id" ? `${String(field.value["prefix"] ?? "id")}_abc123`
  : field.value.type === "text" ? "x"
  : field.value.type === "boolean" || field.value.type === "bool" ? true
  : undefined;

/** Kinds a wrong-typed value is certain to be refused by: a scalar. A named schema may be an object or an array, which `{}` could be. */
const scalar = (field: FieldModel, real: unknown): boolean => ["id", "text", "uint", "int", "boolean", "bool"].includes(field.value.type) || ["string", "number", "boolean"].includes(typeof real);

/** What every caller is shown of an answer: the fields with no visibility rule. A private field is optional and a secret is never named, so neither is in a sample. */
const required = (op: OperationModel): ReadonlyArray<[string, FieldModel]> => Object.entries(op.answer).filter(([, f]) => f.visibility === undefined && f.optional !== true);

export interface Sample {
  /** The answer, field by field. */
  readonly answer: Readonly<Record<string, unknown>>;
  /** The fields no value could be found for: a name the refusal's structured content also uses, so a value taken from the schema would be the schema's own word for it. */
  readonly unknown: ReadonlyArray<string>;
  /** The fields a value of the wrong type is certain to be refused for. */
  readonly scalars: ReadonlyArray<string>;
}

/** An answer the operation could give, from its declared fields: the run's value, else the model's, else (outside the refusal's names) the schema's own smallest. */
export const sampleOf = (op: OperationModel, schema: unknown, spans: ReadonlyArray<SpanView> | undefined): Sample => {
  const answer: Record<string, unknown> = {};
  const unknown: Array<string> = [];
  const scalars: Array<string> = [];
  for (const [name, field] of required(op)) {
    const real = observed(spans, op.name, name);
    const known = real ?? fromModel(field);
    const value = known ?? ((ENVELOPE as ReadonlyArray<string>).includes(name) ? undefined : valueOf(propertyOf(schema, name)));
    if (value === undefined) unknown.push(name);
    else answer[name] = value;
    if (scalar(field, known)) scalars.push(name);
  }
  return { answer, unknown, scalars };
};
