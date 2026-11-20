// Generated from blueprint/projections/sdk.ts. Do not edit.
import type * as Source from "../../../../blueprint/things/profile/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** A claimed name's public page, with its links in the order they were put. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Profile = {
  readonly "id": Of<Declared["id"]>;
  readonly "handle": Of<Declared["handle"]>;
  readonly "links": Of<Declared["links"]>;
};
