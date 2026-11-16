// The ledger's SQL, run on node's own SQLite behind the small part of `SqlStorage` it uses; the Durable Object itself
// runs in local/local.test.ts.
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { findRelease, insertRelease, insertVerdict, lastRelease, schema, selectAll, selectLatest } from "./internal/sql.ts";
import type { Provenance, VerdictInput } from "./types.ts";

const memory = () => {
  const db = new DatabaseSync(":memory:");
  const sql = {
    exec: (query: string, ...bindings: Array<string | null>) => {
      const rows = db.prepare(query).all(...bindings) as Array<Record<string, unknown>>;
      return { toArray: () => rows, one: () => rows[0] };
    },
  } as unknown as SqlStorage;
  for (const statement of schema) sql.exec(statement);
  return sql;
};

const main: Provenance = { repository: "acme/acme", ref: "refs/heads/main", workflow: "ci", eventName: "push", sha: "s" };
const pr: Provenance = { ...main, ref: "refs/pull/3/merge", eventName: "pull_request" };
const v = (revision: string, environment: string, operation: string, verdict: "pass" | "fail" = "pass"): VerdictInput => ({ revision, environment, operation, verdict });

let sql: SqlStorage;
beforeEach(() => { sql = memory(); });

describe("verdicts", () => {
  it("keeps every post, oldest first, with where it came from", () => {
    insertVerdict(sql, v("r1", "test", "a.b"), main);
    insertVerdict(sql, v("r1", "test", "a.b", "fail"), pr);
    const all = selectAll(sql, { revision: "r1" });
    expect(all.map((x) => [x.seq, x.verdict, x.ref, x.event_name])).toEqual([[1, "pass", "refs/heads/main", "push"], [2, "fail", "refs/pull/3/merge", "pull_request"]]);
    expect(selectAll(sql, { revision: "nope" })).toEqual([]);
  });

  it("filters by revision, environment, operation and ref, all of the given ones", () => {
    insertVerdict(sql, v("r1", "test", "a.b"), main);
    insertVerdict(sql, v("r1", "staging", "a.b"), main);
    insertVerdict(sql, v("r1", "test", "a.c"), pr);
    expect(selectAll(sql, { environment: "test" })).toHaveLength(2);
    expect(selectAll(sql, { environment: "test", ref: "refs/heads/main" })).toHaveLength(1);
    expect(selectAll(sql, { operation: "a.c", revision: "r1", environment: "test", ref: "refs/pull/3/merge" })).toHaveLength(1);
  });

  it("answers the latest verdict of each operation in each environment, among those that match", () => {
    insertVerdict(sql, v("r1", "test", "a.b"), main);
    insertVerdict(sql, v("r2", "test", "a.b", "fail"), main);
    insertVerdict(sql, v("r2", "staging", "a.b"), main);
    insertVerdict(sql, v("r3", "test", "a.b"), pr);
    expect(selectLatest(sql, {}).map((x) => [x.environment, x.revision])).toEqual([["staging", "r2"], ["test", "r3"]]);
    // A pull request's verdict does not hide main's from a reader who asks for main.
    expect(selectLatest(sql, { ref: "refs/heads/main" }).map((x) => [x.environment, x.revision, x.verdict])).toEqual([["staging", "r2", "pass"], ["test", "r2", "fail"]]);
  });
});

describe("releases", () => {
  it("has none at first, then the last one recorded; a version is found once released", () => {
    expect(lastRelease(sql)).toBeNull();
    insertRelease(sql, "1.0.0", "r1", main);
    insertRelease(sql, "1.1.0", "r2", main);
    expect(lastRelease(sql)).toMatchObject({ version: "1.1.0", revision: "r2", ref: "refs/heads/main" });
    expect(findRelease(sql, "1.0.0")).toMatchObject({ revision: "r1" });
    expect(findRelease(sql, "2.0.0")).toBeNull();
  });
});
