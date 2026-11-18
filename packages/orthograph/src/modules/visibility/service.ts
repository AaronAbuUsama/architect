import type { Role } from "#modules/roles/types.js";
import type { Field } from "#modules/things/types.js";
import type { Value } from "#modules/values/types.js";
import type { Visibility, VisibilityApi } from "./types.ts";

/** A copy of the value or field, marked. The original is untouched, so a value shared elsewhere keeps its own. */
const marked = <X extends Value | Field>(x: X, visibility: Visibility): X => Object.freeze({ ...x, visibility }) as unknown as X;

export const Visibilities: VisibilityApi = {
  visibility: {
    secret: (x) => marked(x, "secret"),
    private: (x, ...roles: ReadonlyArray<Role<any>>) => marked(x, Object.freeze({ kind: "private" as const, to: Object.freeze([...roles]) })),
    public: (x) => marked(x, "public"),
  },
};
