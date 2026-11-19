import type { FieldsInput } from "orthograph";
import type { Audience as Seen, AudienceApi, ItemFields, VisibilityApi } from "./types.ts";
import { sees } from "./internal/rule.ts";
import { schemaFor } from "./internal/schema.ts";

/** Who is looking: `Audience.principal(held)`, `Audience.agent(held)`, `Audience.telemetry`, `Audience.public`, `Audience.owner`. Also the type of one. */
export type Audience = Seen;
export const Audience: AudienceApi = {
  principal: (held = [], options) => Object.freeze({ kind: "principal", held, issuing: options?.issuing === true }),
  agent: (held = []) => Object.freeze({ kind: "agent", held }),
  telemetry: Object.freeze({ kind: "telemetry" }),
  public: Object.freeze({ kind: "public" }),
  owner: Object.freeze({ kind: "owner" }),
};

/** The keys of `values` that the declaration names and `audience` is shown. A key it does not name is never read on. */
const cut = (audience: Seen, fields: FieldsInput, values: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).filter(([key]) => Object.hasOwn(fields, key) && sees(audience, fields[key]!)));

export const Visibility: VisibilityApi = {
  sees,
  redact: (audience, fields, values, items?: ItemFields) => {
    const top = cut(audience, fields, values);
    const listed = top["items"];
    return items !== undefined && Array.isArray(listed) ? { ...top, items: listed.map((item: object) => cut(audience, items, item)) } : top;
  },
  schema: ((audience: Seen, fields: FieldsInput, items?: ItemFields) => schemaFor(audience, fields, items)) as unknown as VisibilityApi["schema"],
  needsRoles: (...groups) => groups.some((fields) => Object.values(fields).some((f) => typeof f.visibility === "object")),
};
