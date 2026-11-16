import type { Field, FieldInput, Thing, ThingsApi } from "./types.ts";
import { valueOf } from "./internal/fields.ts";

export const Things: ThingsApi = {
  thing: (spec) => {
    const fields: Record<string, Field> = {};
    const thing = { kind: "thing", description: spec.description, fields, lives: spec.lives ?? "database" } as Thing as Thing<typeof spec.fields>;
    for (const [key, input] of Object.entries(spec.fields) as Array<[string, FieldInput]>) {
      fields[key] = Object.freeze({
        kind: "field", of: thing as Thing, key, value: valueOf(input), from: input.kind === "field" ? input : undefined,
      });
    }
    return Object.freeze(thing);
  },
};

// The struct schema for any declared fields: payloads, answers, events and errors use it.
export { structOf, valueOf } from "./internal/fields.ts";
