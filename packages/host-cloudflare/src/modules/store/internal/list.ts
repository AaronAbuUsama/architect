// A page of a thing's rows: filtered by the fields it is asked for, in the order the rows were made (SQLite's rowid).
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import type { Listed, ListQuery } from "@formants/language-effect";
import { decodeRow, encodeFields } from "./rows.ts";

/**
 * One more row than the page is fetched, to know whether another page follows. The cursor is the last kept row's rowid:
 * the next page starts after it, so rows made meanwhile never shift a page (unlike an offset).
 */
export const listRows = (sql: SqlClient.SqlClient, table: string, { thing, where, state, order, limit, after }: ListQuery): Effect.Effect<Listed> =>
  Effect.gen(function* () {
    const known = Object.fromEntries(Object.entries(where).filter(([k]) => k in thing.fields));
    const encoded = yield* encodeFields(thing, known, true);
    const conditions = [
      ...Object.entries(encoded).map(([k, v]) => sql`${sql(k)} = ${v}`),
      ...(state !== undefined ? [sql`"state" = ${state}`] : []),
      ...(after !== undefined ? [order === "newest" ? sql`rowid < ${Number(after)}` : sql`rowid > ${Number(after)}`] : []),
    ];
    const filter = conditions.length > 0 ? sql` WHERE ${sql.and(conditions)}` : sql``;
    const direction = order === "newest" ? sql`DESC` : sql`ASC`;
    const rows = (yield* sql`SELECT rowid AS "_cursor", * FROM ${sql(table)}${filter} ORDER BY rowid ${direction} LIMIT ${limit + 1}`.pipe(Effect.orDie)) as ReadonlyArray<Record<string, unknown>>;
    const kept = rows.slice(0, limit);
    const items = yield* Effect.forEach(kept, (row) => Effect.map(decodeRow(thing, row), (r) => r.instance));
    return { items, next: rows.length > limit ? String(kept[kept.length - 1]!["_cursor"]) : null };
  });
