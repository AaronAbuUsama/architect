import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer } from "effect";
import { describe, expect, it } from "vitest";
import type { Thing } from "orthograph";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "#modules/store/service.js";
import { race } from "../../../test/race.ts";

describe("a thing that lives as an actor, in workerd", () => {
  it("S3's race: 50 concurrent spends of 10 against 500 all land in its Durable Object, none lost", { timeout: 60_000 }, async () => {
    const store = (purse: Thing) => StoreD1.layer({ tables: [[purse, "purse"]], actors: env.ACTORS }).pipe(Layer.provide(Database.d1(env.DB)));
    const result = await Effect.runPromise(race("actor", store));
    expect(result.failures.slice(0, 3)).toEqual([]);
    expect(result.accepted).toBe(50);
    expect(result.after?.instance).toMatchObject({ spent: 500n, state: "exhausted" });
    expect(result.after?.version).toBe(50);
    expect(Exit.isFailure(result.refused) && Cause.squash(result.refused.cause)).toMatchObject({ _tag: "PurseNotActive", state: "exhausted" });
    // Nothing went to D1: the actor owns its row.
    const inD1 = await env.DB.prepare(`SELECT count(*) AS n FROM "purse" WHERE "id" = ?`).bind(result.after?.instance["id"]).first<{ n: number }>();
    expect(inD1?.n).toBe(0);
  });
});
