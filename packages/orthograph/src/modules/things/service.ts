import type { Field, FieldInput, Thing, ThingsApi } from "./types.ts";
import { valueOf } from "./internal/fields.ts";

export const Things: ThingsApi = {
  thing: (spec) => {
    const fields: Record<string, Field> = {};
    const declared = typeof spec.lives === "object" ? spec.lives : undefined;
    const lives = declared ? declared.of : (spec.lives ?? "database");
    const thing = { kind: "thing", description: spec.description, fields, lives, store: declared, code: spec.code } as Thing as Thing<typeof spec.fields>;
    for (const [key, input] of Object.entries(spec.fields) as Array<[string, FieldInput]>) {
      fields[key] = Object.freeze({
        kind: "field", of: thing as Thing, key, value: valueOf(input), from: input.kind === "field" ? input : undefined, visibility: input.visibility,
        ...(input.traced === true ? { traced: true as const } : {}),
        ...(input.issued === true ? { issued: true as const } : {}),
      });
    }
    return Object.freeze(thing);
  },
};

// The struct schema for any declared fields: payloads, answers, events and errors use it.
export { structOf, valueOf } from "./internal/fields.ts";
