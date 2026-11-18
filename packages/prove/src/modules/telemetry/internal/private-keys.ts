// The Collector's second guard (L2.P): every attribute key the model says may carry a non-public value. The first guard is
// the runtime's allowlist, which never writes such a value; this one deletes the key if something else does anyway.
import type { FieldsModel, Model } from "@orthograph/compiler";

const nonPublic = (fields: FieldsModel) => Object.entries(fields).filter(([, f]) => f.visibility !== undefined).map(([k]) => k);

/**
 * `payload.<field>` and `answer.<field>` for every secret or private field of every operation, and the bare field name
 * too (a log line annotated with it). A name that is public in another operation is deleted there as well: the guard
 * leans towards deleting.
 */
export const privateKeys = (model: Model): ReadonlyArray<string> => {
  const keys = new Set<string>();
  for (const op of Object.values(model.operations)) {
    for (const k of nonPublic(op.payload)) for (const key of [`payload.${k}`, k]) keys.add(key);
    for (const k of nonPublic(op.answer)) for (const key of [`answer.${k}`, k]) keys.add(key);
  }
  for (const t of Object.values(model.things)) {
    for (const k of nonPublic(t.fields)) keys.add(k);
    for (const e of Object.values(t.errors)) for (const k of nonPublic(e.fields)) keys.add(k);
    for (const e of Object.values(t.events)) for (const k of nonPublic(e)) keys.add(k);
  }
  return [...keys].sort();
};
