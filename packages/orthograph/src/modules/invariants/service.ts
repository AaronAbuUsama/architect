import type { Field } from "#modules/things/types.js";
import type { InvariantsApi, Unique } from "./types.ts";

export const Invariants: InvariantsApi = {
  invariant: {
    unique: ((key: Field | ReadonlyArray<Field>, options?: { readonly while?: Unique["while"]; readonly refuse?: Unique["refuse"]; readonly description?: string }) =>
      Object.freeze({
        kind: "invariant", form: "unique",
        fields: Object.freeze(Array.isArray(key) ? [...key] : [key]),
        while: options?.while === undefined ? undefined : Object.freeze([...options.while]),
        refuse: options?.refuse, description: options?.description,
      })) as unknown as InvariantsApi["invariant"]["unique"],
  },
};
