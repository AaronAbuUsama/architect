import { DurableObject } from "cloudflare:workers";
import type { BookApi, Provenance, VerdictFilter, VerdictInput } from "./types.ts";
import { findRelease, insertRelease, insertVerdict, lastRelease, schema, selectAll, selectLatest } from "./internal/sql.ts";

/** The logbook's Durable Object, bound as `BOOK` and always reached as the one named `book`. Export it from the worker's entry. */
export class Book extends DurableObject<object> implements BookApi {
  constructor(ctx: DurableObjectState, env: object) {
    super(ctx, env);
    for (const statement of schema) ctx.storage.sql.exec(statement);
  }

  record(verdict: VerdictInput, from: Provenance) {
    return insertVerdict(this.ctx.storage.sql, verdict, from);
  }

  verdicts(filter: VerdictFilter) {
    return selectAll(this.ctx.storage.sql, filter);
  }

  latest(filter: VerdictFilter) {
    return selectLatest(this.ctx.storage.sql, filter);
  }

  release(version: string, revision: string, from: Provenance) {
    const sql = this.ctx.storage.sql;
    return findRelease(sql, version) !== null ? null : insertRelease(sql, version, revision, from);
  }

  latestRelease() {
    return lastRelease(this.ctx.storage.sql);
  }
}
