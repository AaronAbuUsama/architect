import type { Role } from "#modules/roles/types.js";
import type { Field, FieldInput } from "#modules/things/types.js";
import type { Value } from "#modules/values/types.js";
import type { Visibility, VisibilityApi } from "./types.ts";

/** A copy of the value or field, marked. The original is untouched, so a value shared elsewhere keeps its own. */
const marked = <X extends Value | Field>(x: X, mark: { visibility: Visibility } | { traced: true }): X =>
  Object.freeze({ ...x, ...mark }) as unknown as X;

export const Visibilities: VisibilityApi = {
  traced: (x) => marked(x, { traced: true }),
  visibility: {
    secret: (x) => marked(x, { visibility: "secret" }),
    private: (x, ...roles: ReadonlyArray<Role<any>>) => marked(x, { visibility: Object.freeze({ kind: "private", to: Object.freeze([...roles]) }) }),
    public: (x) => marked(x, { visibility: "public" }),
  },
};

/** What the declaration lets the runtime put in telemetry (O2). The journal uses visibility alone. */
export const traceable = (field: FieldInput): boolean =>
  field.visibility === "public" && (field.traced === true || (field.kind === "field" ? field.value : field).meta.type !== "text");
