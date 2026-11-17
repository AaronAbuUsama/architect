// The facts of an environment that has closed `/_world/*` (staging, D3 #127): read from its database, never through the
// Worker. The environment's state folder holds D1's SQLite file; it is opened read-only for each read, so every read sees what
// the Worker last committed. In the cloud pass the same two reads go to D1's own API with the operator's credential.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Effect } from "effect";
import type { CallRecord, Facts } from "../types.ts";

const D1_DIR = "v3/d1/miniflare-D1DatabaseObject";
const NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** D1's database file in the state folder: the one SQLite file that holds the journal. */
const databaseIn = (state: string): string | undefined => {
  const dir = join(state, D1_DIR);
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite").map((f) => join(dir, f)).find((file) => {
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      return db.prepare(`SELECT 1 FROM sqlite_master WHERE name = '_journal'`).get() !== undefined;
    } finally {
      db.close();
    }
  });
};

const read = <A>(state: string, query: (db: DatabaseSync) => A): A => {
  const file = databaseIn(state);
  if (file === undefined) throw new Error(`no D1 database in ${state}`);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return query(db);
  } finally {
    db.close();
  }
};

export const databaseFacts = (state: string): Facts => ({
  record: (table, id) =>
    Effect.sync(() => (NAME.test(table) ? (read(state, (db) => db.prepare(`SELECT * FROM "${table}" WHERE "id" = ?`).get(id)) as Record<string, unknown> | undefined) ?? null : null)),
  journal: (trace) =>
    Effect.sync(() =>
      read(state, (db) => db.prepare(`SELECT * FROM "_journal" WHERE "trace" = ? ORDER BY "seq"`).all(trace) as unknown as ReadonlyArray<{ fields: string }>)
        .map((r) => ({ ...r, fields: JSON.parse(r.fields) as unknown })) as unknown as CallRecord["journal"]),
});
