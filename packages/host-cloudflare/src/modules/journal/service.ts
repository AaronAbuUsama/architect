import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";
import { Journal, type Entry } from "@orthograph/language-effect";
import type { JournalD1Api } from "./types.ts";

interface Row { readonly trace: string; readonly operation: string; readonly move: string; readonly subject: string; readonly event: string; readonly fields: string }

export const JournalD1: JournalD1Api = {
  layer: Layer.effect(Journal, Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    return Journal.of({
      ofTrace: (trace) =>
        sql<Row>`SELECT * FROM "_journal" WHERE "trace" = ${trace} ORDER BY "seq"`.pipe(
          Effect.map((rows) => rows.map((r): Entry => ({ ...r, fields: JSON.parse(r.fields) as Entry["fields"] }))),
          Effect.orDie,
        ),
    });
  })),
};
