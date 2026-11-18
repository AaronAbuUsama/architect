import { DurableObject } from "cloudflare:workers";
import type { Committed } from "@orthograph/language-effect";
import type { EntityApi, EntityEntry, EntityRow, EntityWrite } from "./types.ts";
import { SCHEMA } from "./internal/tables.ts";

interface Stored { readonly row: string; readonly state: string | null; readonly version: number }

/**
 * One instance of a thing that lives as an entity. Export it from the Worker's entry and bind it as `ENTITIES`; the
 * store names each one `<table>:<id>`. Its commit is synchronous inside `transactionSync`, so no other request can
 * run between the version check and the write, and a failed write rolls the whole commit back.
 */
export class Entity extends DurableObject implements EntityApi {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    for (const statement of SCHEMA) ctx.storage.sql.exec(statement);
  }

  private stored(): Stored | undefined {
    return this.ctx.storage.sql.exec<Stored & Record<string, SqlStorageValue>>("SELECT row, state, version FROM instance").toArray()[0];
  }

  find(): EntityRow | null {
    const s = this.stored();
    return s ? { row: JSON.parse(s.row) as Record<string, unknown>, state: s.state, version: s.version } : null;
  }

  commit(writes: ReadonlyArray<EntityWrite>, entries: ReadonlyArray<EntityEntry>): Committed {
    const sql = this.ctx.storage.sql;
    return this.ctx.storage.transactionSync((): Committed => {
      const now = this.stored();
      for (const w of writes) {
        if (w.kind === "insert") {
          sql.exec("INSERT INTO instance (one, row, state, version) VALUES (1, ?, ?, 0)", JSON.stringify(w.row), w.state);
          continue;
        }
        if (!now || now.version !== w.version) return "conflict";
        const row = { ...(JSON.parse(now.row) as Record<string, unknown>), ...w.changes };
        sql.exec("UPDATE instance SET row = ?, state = coalesce(?, state), version = version + 1", JSON.stringify(row), w.state);
      }
      for (const e of entries) {
        sql.exec("INSERT INTO journal (trace, operation, move, subject, event, fields) VALUES (?, ?, ?, ?, ?, ?)", e.trace, e.operation, e.move, e.subject, e.event, e.fields);
      }
      return "committed";
    });
  }
}
