// What a caller may see (L2.P, D3 #125). `public` is shown to everyone; `secret` to no one; `private` to the roles it names,
// for a caller who holds one of them in this call. A field the declaration doesn't name is never shown: this fails closed.
import type { Role, Visibility } from "@formants/forman";
import type { FieldsInput } from "@formants/forman";

export type Seen = (visibility: Visibility | undefined) => boolean;

/** Whether a field declared with this visibility is shown to a caller who holds `held`. */
export const seenBy = (held: ReadonlyArray<Role>): Seen => (v) =>
  v === "public" || (typeof v === "object" && v.to.some((role) => held.includes(role)));

/** Some field is private to roles, so who holds which role matters to what is shown. */
export const needsRoles = (...groups: ReadonlyArray<FieldsInput>): boolean =>
  groups.some((fields) => Object.values(fields).some((f) => typeof f.visibility === "object"));

/** The keys of `values` whose declared field is shown. */
export const shownOf = (values: object, fields: FieldsInput, seen: Seen): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).filter(([k]) => Object.hasOwn(fields, k) && seen(fields[k]!.visibility)));

/** A payload field the caller may not give: declared, and not public. A tool never offers it and never takes it. */
export const hiddenInputs = (payload: FieldsInput): ReadonlyArray<string> =>
  Object.keys(payload).filter((k) => payload[k]!.visibility !== "public");

/** Values as text: bigints as their digits, so what an MCP client reads is what the wire carries. */
export const text = (x: unknown): string => JSON.stringify(x, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
