import { Schema } from "effect";
import type { FieldsInput } from "@architect/blueprint";
import { hiddenInputs } from "./shown.ts";

type Json = { readonly [key: string]: unknown };

/**
 * A tool's input schema: the JSON Schema of the operation's payload, as it travels (bigints as digit strings), with the
 * fields that are not public taken out. Excess properties are refused, so a secret can't be sent by naming it anyway.
 */
export const inputSchema = (payloadSchema: Schema.Top, payload: FieldsInput): Json => {
  const { schema, definitions } = Schema.toJsonSchemaDocument(payloadSchema);
  const full = schema as { readonly properties?: Json; readonly required?: ReadonlyArray<string> };
  const hidden = new Set(hiddenInputs(payload));
  return {
    type: "object",
    properties: Object.fromEntries(Object.entries(full.properties ?? {}).filter(([k]) => !hidden.has(k))),
    required: (full.required ?? []).filter((k) => !hidden.has(k)),
    additionalProperties: false,
    ...(Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  };
};
