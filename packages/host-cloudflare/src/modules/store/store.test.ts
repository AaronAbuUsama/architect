import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { Store } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { race } from "../../../test/race.ts";
import { StoreD1 } from "./service.ts";

describe("the store in D1, in workerd", () => {
  it("rolls back the batch when an insert loses an id race on a hyphenated table", () =>
    Effect.runPromise(Effect.gen(function* () {
      yield* Effect.promise(() => env.DB.prepare(
        'CREATE TABLE "named-record" (id TEXT PRIMARY KEY, version INTEGER NOT NULL)',
      ).run());
      const thing = Blueprint.thing({ description: "A record with a reserved id.", fields: { id: Blueprint.id("rec") } });
      const runtime = StoreD1.layer({ tables: [[thing, "named-record"]] }).pipe(Layer.provide(Database.d1(env.DB)));
      const write = (id: string) => ({ kind: "insert" as const, thing, fields: { id }, state: undefined });
      const result = yield* Effect.gen(function* () {
        const store = yield* Store;
        const first = yield* store.commit({ writes: [write("rec_taken")], entries: [] });
        const second = yield* store.commit({ writes: [write("rec_new"), write("rec_taken")], entries: [] });
        const rolledBack = yield* store.find(thing, "rec_new");
        return { first, second, rolledBack };
      }).pipe(Effect.provide(runtime));
      expect(result).toEqual({ first: "committed", second: "conflict", rolledBack: undefined });
    })));


  it("S3's race: 50 concurrent spends of 10 against 500 all land, none lost, and it ends exhausted", { timeout: 60_000 }, async () => {
    const store = (purse: Thing) => StoreD1.layer({ tables: [[purse, "purse"]] }).pipe(Layer.provide(Database.d1(env.DB)));
    const result = await Effect.runPromise(race("database", store));
    expect(result.failures.slice(0, 3)).toEqual([]);
    expect(result.accepted).toBe(50);
    expect(result.after?.instance).toMatchObject({ spent: 500n, state: "exhausted" });
    expect(result.after?.version).toBe(50);
    expect(Exit.isFailure(result.refused) && Cause.squash(result.refused.cause)).toMatchObject({ _tag: "PurseNotActive", state: "exhausted" });
    const events = await env.DB.prepare(`SELECT count(*) AS n FROM "_journal" WHERE "subject" = ? AND "event" = 'PurseSpent'`).bind(result.after?.instance["id"]).first<{ n: number }>();
    expect(events?.n).toBe(50);
  });
});
