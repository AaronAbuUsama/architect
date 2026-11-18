import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { D1Client } from "@effect/sql-d1";
import type { Thing } from "orthograph";
import { Store, type Commit, type Entry, type Write } from "@orthograph/language-effect";
import type { StoreD1Api } from "./types.ts";
import { decodeRow, encodeFields, lostGuard } from "./internal/rows.ts";
import { entityCommit, entityFind } from "./internal/entities.ts";
import { listRows } from "./internal/list.ts";

export const StoreD1: StoreD1Api = {
  layer: ({ tables, entities }) =>
    Layer.effect(Store, Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const d1 = yield* D1Client.D1Client;
      const tableOf = (thing: Thing) => tables.find(([t]) => t === thing)?.[1] ?? "";
      const noEntities = Effect.die(new Error("a thing lives as an entity, but the Worker has no ENTITIES binding"));

      const statementOf = (w: Write) =>
        Effect.gen(function* () {
          const table = sql(tableOf(w.thing));
          if (w.kind === "insert") {
            const row = yield* encodeFields(w.thing, w.fields, false);
            return sql`INSERT INTO ${table} ${sql.insert({ ...row, ...(w.state ? { state: w.state } : {}), version: 0 })}`;
          }
          const row = { ...(yield* encodeFields(w.thing, w.changes, true)), ...(w.state ? { state: w.state } : {}) };
          // The guard: a stale version becomes NULL on a NOT NULL column, which fails the whole batch (D2 #36).
          const guard = sql`"version" = CASE WHEN "version" = ${w.version} THEN "version" + 1 ELSE NULL END`;
          return Object.keys(row).length > 0
            ? sql`UPDATE ${table} SET ${sql.update(row)}, ${guard} WHERE "id" = ${w.id}`
            : sql`UPDATE ${table} SET ${guard} WHERE "id" = ${w.id}`;
        });
      const journalOf = (e: Entry) =>
        sql`INSERT INTO "_journal" ${sql.insert({ trace: e.trace, operation: e.operation, move: e.move, subject: e.subject, event: e.event, fields: JSON.stringify(e.fields) })}`;

      const commitD1 = ({ writes, entries, request }: Commit) =>
        Effect.gen(function* () {
          const keep = request ? [sql`INSERT INTO "_requests" ${sql.insert({ key: request.key, answer: request.answer })}`] : [];
          const statements = [...(yield* Effect.forEach(writes, statementOf)), ...entries.map(journalOf), ...keep];
          if (statements.length === 0) return "committed" as const;
          return yield* d1.batch(statements).pipe(
            Effect.as("committed" as const),
            Effect.catch((e) => (lostGuard(e) ? Effect.succeed("conflict" as const) : Effect.die(e))),
          );
        });

      return Store.of({
        answered: (key) =>
          sql<{ answer: string }>`SELECT "answer" FROM "_requests" WHERE "key" = ${key}`.pipe(
            Effect.map((rows) => rows[0]?.answer),
            Effect.orDie,
          ),
        list: (query) =>
          query.thing.lives === "entity"
            ? Effect.die(new Error("a list read needs a thing that lives in the database; entities keep one instance each"))
            : listRows(sql, tableOf(query.thing), query),
        find: (thing, id) =>
          thing.lives === "entity"
            ? (entities ? entityFind(entities, thing, tableOf(thing), id) : noEntities)
            : Effect.gen(function* () {
                const rows = yield* sql`SELECT * FROM ${sql(tableOf(thing))} WHERE "id" = ${id}`.pipe(Effect.orDie);
                const row = rows[0] as Record<string, unknown> | undefined;
                return row ? yield* decodeRow(thing, row) : undefined;
              }),
        commit: (commit) => {
          const owners = new Set(commit.writes.map((w) => w.thing.lives));
          if (owners.size > 1) return Effect.die(new Error("a call wrote to both a database thing and an entity: one owner per call in layer one (D2 #38)"));
          if (!owners.has("entity")) return commitD1(commit);
          if (commit.request) return Effect.die(new Error("a request key on an entity's operation: idempotent entities arrive with layer four (design/later.md)"));
          return entities ? entityCommit(entities, commit, tableOf) : noEntities;
        },
      });
    })),
};
