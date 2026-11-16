// The worlds a long-lived environment holds: one row each in `_worlds`, with the high-water mark of every table taken
// when the world was made. A world's data is what is above those marks, so destroying it deletes exactly that (D3 #50).
import { Effect } from "effect";

const CREATE = `CREATE TABLE IF NOT EXISTS "_worlds" ("id" TEXT PRIMARY KEY, "created" INTEGER NOT NULL, "expires" INTEGER NOT NULL, "marks" TEXT NOT NULL, "ended" INTEGER, "reason" TEXT, "reported" INTEGER NOT NULL DEFAULT 0)`;

/** The tables a world fills: everything but SQLite's, Cloudflare's, the migrations' and this registry. */
const WORLD_TABLES = `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND name NOT IN ('d1_migrations', '_worlds')`;

export interface Lease {
  readonly id: string;
  readonly created: number;
  readonly expires: number;
  readonly marks: Readonly<Record<string, number>>;
}

type Row = Omit<Lease, "marks"> & { readonly marks: string; readonly ended: number | null; readonly reason: string | null; readonly reported: number };

const ready = (db: D1Database) => Effect.promise(() => db.prepare(CREATE).run());

const toLease = (row: Row): Lease => ({ id: row.id, created: row.created, expires: row.expires, marks: JSON.parse(row.marks) as Record<string, number> });

/** Every live world: not yet destroyed. */
export const live = (db: D1Database) =>
  Effect.gen(function* () {
    yield* ready(db);
    const { results } = yield* Effect.promise(() => db.prepare(`SELECT * FROM "_worlds" WHERE "ended" IS NULL ORDER BY "created"`).all<Row>());
    return results.map(toLease);
  });

/** A new live world, its tables' marks taken now. Whoever calls checks that no other world is live. */
export const begin = (db: D1Database, world: { readonly id: string; readonly now: number; readonly lifetimeMs: number }) =>
  Effect.gen(function* () {
    yield* ready(db);
    const { results: tables } = yield* Effect.promise(() => db.prepare(WORLD_TABLES).all<{ name: string }>());
    const maxima = yield* Effect.promise(() => db.batch(tables.map((t) => db.prepare(`SELECT COALESCE(MAX(rowid), 0) AS mark FROM "${t.name}"`))));
    const marks = Object.fromEntries(tables.map((t, i) => [t.name, (maxima[i]!.results[0] as { mark: number }).mark]));
    const lease: Lease = { id: world.id, created: world.now, expires: world.now + world.lifetimeMs, marks };
    yield* Effect.promise(() =>
      db.prepare(`INSERT INTO "_worlds" ("id", "created", "expires", "marks") VALUES (?, ?, ?, ?)`).bind(lease.id, lease.created, lease.expires, JSON.stringify(marks)).run());
    return lease;
  });

/**
 * Delete what the world made (every row above its marks) and mark it ended with why. `false` when it was already
 * ended, so the alarm, a reap and an explicit destroy can all arrive and only the first counts.
 */
export const end = (db: D1Database, id: string, reason: "destroyed" | "expired", now: number) =>
  Effect.gen(function* () {
    yield* ready(db);
    const row = yield* Effect.promise(() => db.prepare(`SELECT * FROM "_worlds" WHERE "id" = ?`).bind(id).first<Row>());
    if (!row || row.ended !== null) return false;
    const marks = toLease(row).marks;
    // A table made since (Better Auth makes its own on first use) was empty when the world began: its mark is 0.
    const { results: tables } = yield* Effect.promise(() => db.prepare(WORLD_TABLES).all<{ name: string }>());
    yield* Effect.promise(() =>
      db.batch([
        db.prepare("PRAGMA defer_foreign_keys = on"),
        ...tables.map((t) => db.prepare(`DELETE FROM "${t.name}" WHERE rowid > ?`).bind(marks[t.name] ?? 0)),
        db.prepare(`UPDATE "_worlds" SET "ended" = ?, "reason" = ? WHERE "id" = ?`).bind(now, reason, id),
      ]));
    return true;
  });

/** Worlds whose lifetime has run out and that nothing has destroyed yet. */
export const overdue = (db: D1Database, now: number) => live(db).pipe(Effect.map((all) => all.filter((l) => l.expires <= now)));

/** How many worlds ended by expiry that nobody has been told about, now told: `reaped <n>` reports each once. */
export const reportReaped = (db: D1Database) =>
  Effect.gen(function* () {
    yield* ready(db);
    const done = yield* Effect.promise(() => db.prepare(`UPDATE "_worlds" SET "reported" = 1 WHERE "reason" = 'expired' AND "reported" = 0`).run());
    return done.meta.changes;
  });
