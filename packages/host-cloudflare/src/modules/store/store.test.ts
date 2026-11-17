import { env } from "cloudflare:workers";
import { Cause, Effect, Exit, Layer, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "@architect/blueprint";
import { decodeRow, encodeFields } from "./internal/rows.ts";
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

describe("a row's columns", () => {
  const Tags = Blueprint.value(Schema.Array(Schema.String));
  const Label = Blueprint.value(Schema.String);
  const Note = Blueprint.thing({ description: "A note.", fields: { id: Blueprint.id("not"), tags: Tags, label: Label } });

  it("keeps an array field as JSON, which D1 can bind, and reads it back; a string starting with [ stays a string", async () => {
    const instance = { id: "not_1", tags: ["a", "b"], label: "[draft]" };
    const row = await Effect.runPromise(encodeFields(Note, instance, false));
    expect(row).toEqual({ id: "not_1", tags: '["a","b"]', label: "[draft]" });
    const back = await Effect.runPromise(decodeRow(Note, { ...row, version: 1 }));
    expect(back.instance).toEqual(instance);
  });
});
