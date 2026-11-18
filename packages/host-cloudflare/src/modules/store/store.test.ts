import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { Thing } from "orthograph";
import { Database } from "#modules/database/service.js";
import { race } from "../../../test/race.ts";
import { StoreD1 } from "./service.ts";

describe("the store in D1, in workerd", () => {
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
