import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import type { Thing } from "@architect/blueprint";
import { structOf } from "@architect/blueprint/server";
import { Records, type Instance } from "@architect/target-effect";
import type { RecordsD1Api } from "./types.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

export const RecordsD1: RecordsD1Api = {
  layer: (tables) =>
    Layer.effect(Records, Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const tableOf = (thing: Thing) =>
        tables.find(([t]) => t === thing)?.[1] ?? "";
      // Columns hold each field's wire form (text), so the thing's own schema decodes and encodes them.
      const codecOf = (thing: Thing) => structOf(thing.fields) as unknown as Codec;
      return Records.of({
        find: (thing, id) =>
          Effect.gen(function* () {
            const rows = yield* sql`SELECT * FROM ${sql(tableOf(thing))} WHERE "id" = ${id}`;
            const row = rows[0] as Record<string, unknown> | undefined;
            if (!row) return undefined;
            const fields = yield* Schema.decodeUnknownEffect(codecOf(thing))(row);
            return (typeof row["state"] === "string" ? { ...fields, state: row["state"] } : fields) as Instance;
          }).pipe(Effect.orDie),
        insert: (thing, fields, state) =>
          Effect.gen(function* () {
            const row = yield* Schema.encodeEffect(codecOf(thing))(fields as Record<string, unknown>);
            yield* sql`INSERT INTO ${sql(tableOf(thing))} ${sql.insert(state ? { ...row, state } : row)}`;
          }).pipe(Effect.orDie),
        setState: (thing, id, state) =>
          sql`UPDATE ${sql(tableOf(thing))} SET "state" = ${state} WHERE "id" = ${id}`.pipe(Effect.asVoid, Effect.orDie),
      });
    })),
};
