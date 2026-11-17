// The worlds a long-lived environment holds: one row each in `_worlds`, with the high-water mark of every table taken
// when the world was made. A world's data is what is above those marks, so destroying it deletes exactly that (D3 #50).
import { Effect } from "effect";

const CREATE = `CREATE TABLE IF NOT EXISTS "_worlds" ("id" TEXT PRIMARY KEY, "created" INTEGER NOT NULL, "expires" INTEGER NOT NULL, "marks" TEXT NOT NULL, "ended" INTEGER, "reason" TEXT, "reported" INTEGER NOT NULL DEFAULT 0)`;

const ONE_LIVE = `CREATE UNIQUE INDEX IF NOT EXISTS "_worlds_one_live" ON "_worlds" ((1)) WHERE "ended" IS NULL`;

/** The tables a world fills: everything but SQLite's, Cloudflare's, the migrations' and this registry. */
const WORLD_TABLES = `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND name NOT IN ('d1_migrations', '_worlds')`;

export interface Lease {
  readonly id: string;
  readonly created: number;
  readonly expires: number;
  readonly marks: Readonly<Record<string, number>>;
}

type Row = Omit<Lease, "marks"> & { readonly marks: string; readonly ended: number | null; readonly reason: string | null; readonly reported: number };

// Additive only: an already-corrupt registry fails closed instead of choosing a world or deleting its data.
const ready = (db: D1Database) => Effect.promise(() => db.batch([db.prepare(CREATE), db.prepare(ONE_LIVE)]));

const toLease = (row: Row): Lease => ({ id: row.id, created: row.created, expires: row.expires, marks: JSON.parse(row.marks) as Record<string, number> });

/** Every live world: not yet destroyed. */
export const live = (db: D1Database) =>
  Effect.gen(function* () {
    yield* ready(db);
    const { results } = yield* Effect.promise(() => db.prepare(`SELECT * FROM "_worlds" WHERE "ended" IS NULL ORDER BY "created"`).all<Row>());
    return results.map(toLease);
  });

/** Bounded JSON functions keep the snapshot in one INSERT without a compound SELECT. */
const markExpression = (tables: ReadonlyArray<{ readonly name: string }>): string => {
  let parts: Array<string> = [];
  for (let i = 0; i < tables.length; i += 8) {
    const fields = tables.slice(i, i + 8).flatMap(({ name }) => [
      `'${name.replaceAll("'", "''")}'`, `(SELECT COALESCE(MAX(rowid), 0) FROM "${name.replaceAll('"', '""')}")`,
    ]);
    parts.push(`json_object(${fields.join(", ")})`);
  }
  while (parts.length > 1) {
    const next: Array<string> = [];
    for (let i = 0; i < parts.length; i += 2) next.push(parts[i + 1] ? `json_patch(${parts[i]}, ${parts[i + 1]})` : parts[i]!);
    parts = next;
  }
  return parts[0] ?? "'{}'";
};

/** Take the single-live slot atomically. A losing caller receives the owner from the same transaction. */
export const begin = (db: D1Database, world: { readonly id: string; readonly now: number; readonly lifetimeMs: number }) =>
  Effect.gen(function* () {
    yield* ready(db);
    const { results: tables } = yield* Effect.promise(() => db.prepare(WORLD_TABLES).all<{ name: string }>());
    // Marks are evaluated inside the guarded INSERT, never before another world's teardown can commit.
    const marks = markExpression(tables);
    const [inserted, held] = yield* Effect.promise(() => db.batch([
      db.prepare(`INSERT INTO "_worlds" ("id", "created", "expires", "marks")
        SELECT ?, ?, ?, ${marks} WHERE NOT EXISTS (SELECT 1 FROM "_worlds" WHERE "ended" IS NULL)
        ON CONFLICT ("id") DO NOTHING`).bind(world.id, world.now, world.now + world.lifetimeMs),
      db.prepare(`SELECT * FROM "_worlds" WHERE "ended" IS NULL ORDER BY "created" LIMIT 1`),
    ]));
    const owner = held!.results[0] as Row | undefined;
    if (inserted!.meta.changes > 0) return { kind: "created", lease: toLease(owner!) } as const;
    return owner ? { kind: "live", lease: toLease(owner) } as const : { kind: "used" } as const;
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
    const changes = yield* Effect.promise(() =>
      db.batch([
        db.prepare("PRAGMA defer_foreign_keys = on"),
        // The reads above may interleave. Every deletion and the ending transition share this transaction guard.
        ...tables.map((t) => db.prepare(`DELETE FROM "${t.name.replaceAll('"', '""')}" WHERE rowid > ?
          AND EXISTS (SELECT 1 FROM "_worlds" WHERE "id" = ? AND "ended" IS NULL)`).bind(marks[t.name] ?? 0, id)),
        db.prepare(`UPDATE "_worlds" SET "ended" = ?, "reason" = ? WHERE "id" = ? AND "ended" IS NULL`).bind(now, reason, id),
      ]));
    return changes.at(-1)!.meta.changes > 0;
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
