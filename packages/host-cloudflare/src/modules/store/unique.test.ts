// G4 (S-04), the D1 store's half: a commit that breaks a unique field's index is a `conflict`, never a defect, so the call runs
// again and its `findBy` sees the winner. The table is test/migrations/0005_handles.sql: what the host's DDL makes from
// `unique: { name: { while: ["claimed"] } }`, a partial unique index `WHERE "state" IN ('claimed')`. Real workerd, real D1.
// Written by the checks author; the builder never edits this file or that migration.
//
// SPELLING: `Handle`'s `unique:` line below is G4's first spelling; a builder who settles on `Blueprint.unique(...)` changes only it.
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Store, type Write } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "./service.ts";

const Handle = Blueprint.thing({
  description: "A name someone holds.",
  fields: { id: Blueprint.id("hdl"), name: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});
const store = StoreD1.layer({ tables: [[Handle, "handle"]] }).pipe(Layer.provide(Database.d1(env.DB)));
const run = <A>(program: Effect.Effect<A, never, Store>) => Effect.runPromise(program.pipe(Effect.provide(store)));

const insert = (id: string, name: string, state: string): Write => ({ kind: "insert", thing: Handle, fields: { id, name }, state });
const move = (id: string, version: number, state: string): Write => ({ kind: "update", thing: Handle, id, version, changes: {}, state });
const commit = (...writes: ReadonlyArray<Write>) => Effect.flatMap(Store, (s) => s.commit({ writes, entries: [] }));
const rowsOf = () => env.DB.prepare(`SELECT "id" FROM "handle" ORDER BY "id"`).all<{ id: string }>().then((r) => r.results.map((x) => x.id));

describe("G4 control: the table and its index are there, and a plain insert commits", () => {
  it("has a partial unique index over the scope, and commits a handle outside any clash", async () => {
    const index = await env.DB.prepare(`SELECT "sql" FROM sqlite_master WHERE type = 'index' AND name = 'handle_name_unique'`).first<{ sql: string }>();
    expect(index?.sql).toMatch(/WHERE "state" IN \('claimed'\)/);
    expect(await run(commit(insert("hdl_control", "control", "claimed")))).toBe("committed");
    expect(await run(Effect.flatMap(Store, (s) => s.find(Handle, "hdl_control")))).toMatchObject({ instance: { name: "control", state: "claimed" } });
  });
});

describe("a unique field in D1 (G4)", () => {
  it("refuses a second holder of a name as a conflict, and writes none of that commit", async () => {
    expect(await run(commit(insert("hdl_a1", "ada", "claimed")))).toBe("committed");
    // The loser also inserts another name; the whole commit is refused, so that one is not stored either.
    const lost = await run(commit(insert("hdl_a2", "ada", "claimed"), insert("hdl_b1", "bob", "claimed")));
    expect(lost).toBe("conflict");
    expect((await rowsOf()).filter((id) => id.startsWith("hdl_a") || id.startsWith("hdl_b"))).toEqual(["hdl_a1"]);
  });

  it("leaves the scope free: a released holder keeps its name, and the same name may be claimed again", async () => {
    expect(await run(commit(insert("hdl_c1", "cy", "claimed")))).toBe("committed");
    expect(await run(commit(move("hdl_c1", 0, "released")))).toBe("committed");
    expect(await run(commit(insert("hdl_c2", "cy", "claimed")))).toBe("committed"); // freed
    expect(await run(commit(insert("hdl_c3", "cy", "released")))).toBe("committed"); // outside the scope: any number
  });

  it("refuses a move back into the scope while another holds the name, and lets it land once they let go", async () => {
    // Its own rows: d1 released holding "di", d2 claimed holding it now.
    expect(await run(commit(insert("hdl_d1", "di", "claimed")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 0, "released")))).toBe("committed");
    expect(await run(commit(insert("hdl_d2", "di", "claimed")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 1, "claimed")))).toBe("conflict");
    const row = await env.DB.prepare(`SELECT "state", "version" FROM "handle" WHERE "id" = 'hdl_d1'`).first();
    expect(row).toEqual({ state: "released", version: 1 }); // untouched
    expect(await run(commit(move("hdl_d2", 0, "released")))).toBe("committed");
    expect(await run(commit(move("hdl_d1", 1, "claimed")))).toBe("committed");
  });

  it("is a conflict however many race: of ten concurrent first claims of one name, one commits and nine conflict, none dies", { timeout: 60_000 }, async () => {
    const outcomes = await Promise.all(Array.from({ length: 10 }, (_, i) => run(commit(insert(`hdl_r${i}`, "grace", "claimed")))));
    expect(outcomes.filter((o) => o === "committed")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "conflict")).toHaveLength(9);
    expect((await rowsOf()).filter((id) => id.startsWith("hdl_r"))).toHaveLength(1);
  });
});
