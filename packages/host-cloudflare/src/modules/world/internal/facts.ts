// The world's facts: what `prove` reads back after a call, straight from the database, in wire form.
// `GET /_world/facts/record?table=<thing>&id=<id>` gives a row (or null); `GET /_world/facts/journal?trace=<id>` the
// trace's journal entries. Only tables the generated server names can be read.
import { Effect } from "effect";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const facts = (db: D1Database, tables: ReadonlyArray<string>, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const url = new URL(request.url);
    const q = (k: string) => url.searchParams.get(k) ?? "";
    if (url.pathname === "/_world/facts/record") {
      const table = q("table");
      if (!tables.includes(table)) return json({ error: `no table ${table}` }, 404);
      const row = yield* Effect.promise(() => db.prepare(`SELECT * FROM "${table}" WHERE "id" = ?`).bind(q("id")).first());
      return json(row ?? null);
    }
    if (url.pathname === "/_world/facts/journal") {
      const { results } = yield* Effect.promise(() => db.prepare(`SELECT * FROM "_journal" WHERE "trace" = ? ORDER BY "seq"`).bind(q("trace")).all<{ fields: string }>());
      return json(results.map((r) => ({ ...r, fields: JSON.parse(r.fields) as unknown })));
    }
    return json({ error: "not a door the world has" }, 404);
  });
