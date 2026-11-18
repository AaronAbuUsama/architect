import type { Field, Thing } from "@formants/forman";

const isField = (x: unknown): x is Field => typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "field";

/** The thing whose id a field holds: follow the field back to the `id` it was taken from. */
export const referencedThing = (field: unknown): Thing | undefined => {
  let f: Field | undefined = isField(field) ? field : undefined;
  while (f) {
    if (f.key === "id") return f.of;
    f = f.from;
  }
  return undefined;
};
