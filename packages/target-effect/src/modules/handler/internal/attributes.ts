// What a span may say about a call. An allowlist, built from the declaration's `visibility` (L2.P): only a field declared
// public has its value written as an attribute. A secret or private field is absent, and so is anything the
// declaration doesn't name, so the allowlist fails closed: a new kind of field is never an attribute by accident.
import type { FieldsInput } from "@architect/blueprint";

const text = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "bigint" ? v.toString() : JSON.stringify(v, (_, x: unknown) => (typeof x === "bigint" ? x.toString() : x));

/** Only the entries of `values` whose declared field is public. */
export const publicOnly = (values: object, fields: FieldsInput): Array<[string, unknown]> =>
  Object.entries(values).filter(([k]) => Object.hasOwn(fields, k) && fields[k]!.visibility === "public");

/** A payload as span attributes: `payload.<field>`, every value as text so bigints and ids read the same everywhere. */
export const payloadAttributes = (payload: object, fields: FieldsInput): Record<string, string> =>
  Object.fromEntries(publicOnly(payload, fields).map(([k, v]) => [`payload.${k}`, text(v)]));

export const principalAttributes = (principal: { readonly kind: string; readonly person?: string }): Record<string, string> =>
  principal.kind === "person" && principal.person ? { "principal.person": principal.person } : { "principal.kind": principal.kind };

/**
 * An answer as span attributes, `answer.<field>`, kept as it came (a number stays a number) so a wrong shape shows.
 * A list's `items` are whole instances, so each is cut down to the thing's public fields (and `state`) first.
 */
export const answerAttributes = (answer: unknown, fields: FieldsInput, items?: FieldsInput): Record<string, unknown> => {
  if (typeof answer !== "object" || answer === null) return {};
  const shown = (k: string, v: unknown) =>
    k === "items" && items !== undefined && Array.isArray(v)
      ? v.map((i: object) => Object.fromEntries(Object.entries(i).filter(([f]) => f === "state" || items[f]?.visibility === "public")))
      : v;
  return Object.fromEntries(
    publicOnly(answer, fields).map(([k, v]) => {
      const x = shown(k, v);
      return [`answer.${k}`, typeof x === "bigint" ? x.toString() : typeof x === "object" ? text(x) : x];
    }),
  );
};

/** Whether a field of an event may be written to the journal. */
export const journalled = (fields: FieldsInput, key: string): boolean => fields[key]?.visibility === "public";
