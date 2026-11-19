// A unique field's index refusing a commit (G4): D1 words it `UNIQUE constraint failed: <table>.<column>`. Only a column this
// commit's things declare unique counts, so any other constraint failure stays a defect.
import type { Write } from "@orthograph/language-effect";

/** Did this failure come from the unique index of a field one of these writes' things declares unique? */
export const lostUnique = (error: unknown, writes: ReadonlyArray<Write>, tableOf: (thing: Write["thing"]) => string): boolean => {
  const columns = new Set(writes.flatMap((w) => Object.keys(w.thing.unique).map((field) => `${tableOf(w.thing)}.${field}`)));
  if (columns.size === 0) return false;
  for (let e: unknown = error, depth = 0; e !== undefined && e !== null && depth < 8; e = (e as { cause?: unknown }).cause, depth++) {
    const message = String((e as { message?: unknown }).message ?? e);
    const failed = /UNIQUE constraint failed: ([\w".,\s]+)/.exec(message)?.[1];
    if (failed && failed.split(",").some((c) => columns.has(c.trim().replaceAll('"', "")))) return true;
  }
  return false;
};
