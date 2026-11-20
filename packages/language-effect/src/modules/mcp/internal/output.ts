import { Schema } from "effect";
import type { FieldsInput } from "orthograph";
import { wireStruct } from "orthograph/server";

type Json = { readonly [key: string]: unknown };

/** What a tool's output schema is made from: the answer's fields, and whether the call is an operation (which may issue a secret). */
interface Answering {
  readonly answer: FieldsInput;
  readonly kind: string;
}

/** The fields an agent can ever be shown of an answer: a secret never leaves through MCP, not even one this call issued. */
const agentFields = (fields: FieldsInput): FieldsInput =>
  Object.fromEntries(Object.entries(fields).filter(([, f]) => f.visibility !== "secret"));

/** The field with a schema of its own choosing, keeping what the wire rule reads of it: its visibility and whether it is issued. */
const reschemed = (field: FieldsInput[string], schema: Schema.Top): FieldsInput[string] => {
  const value = field.kind === "field" ? field.value : field;
  return { kind: "value", schema, meta: value.meta, visibility: field.visibility, ...(field.issued === true ? { issued: true as const } : {}) } as unknown as FieldsInput[string];
};

/** A field's sentence and, for `state`, the machine's own states as the only values it can hold (M1.37, M1.42). */
const told = (fields: FieldsInput, states: ReadonlyArray<string> | undefined): FieldsInput =>
  Object.fromEntries(Object.entries(fields).map(([key, field]) => {
    const value = field.kind === "field" ? field.value : field;
    const base = key === "state" && states !== undefined && states.length > 0 ? (Schema.Literals(states) as unknown as Schema.Top) : (value.schema as Schema.Top);
    const schema = field.description === undefined ? base : base.annotate({ description: field.description });
    return [key, schema === value.schema ? field : reschemed(field, schema)] as const;
  }));

/**
 * A tool's output schema: the JSON Schema of the answer as an agent is shown it (M1.37). A field every caller sees is required; a field
 * private to roles is optional, since the call cuts it for a caller without them; a secret is not named at all.
 * A `state` is one of the thing's states, as an enum. `undefined` for an answer with no fields.
 */
export const outputSchema = (op: Answering, items: FieldsInput = {}, states?: ReadonlyArray<string>): Json | undefined => {
  if (Object.keys(op.answer).length === 0) return undefined;
  const wire = wireStruct(told(agentFields(op.answer), states), {
    ...(Object.keys(items).length > 0 ? { items: told(agentFields(items), states) } : {}),
  });
  const { schema, definitions } = Schema.toJsonSchemaDocument(wire);
  const { required, properties, ...rest } = schema as { readonly required?: ReadonlyArray<string>; readonly properties?: Json } & Json;
  // A refusal comes back as a tool error whose structured content is `{ refusal, code, exit, status, ...its fields }`, and a client checks
  // that against this schema too: so a result is either the answer (its required fields) or a refusal (its row).
  const refusal = ["refusal", "code", "exit", "status"];
  return {
    ...rest,
    type: "object",
    properties: { ...properties, refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } },
    ...((required ?? []).length > 0 ? { anyOf: [{ required }, { required: refusal }] } : {}),
    ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  };
};
