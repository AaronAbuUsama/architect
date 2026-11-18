import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Journal, Store } from "@orthograph/language-effect";
import { Database } from "#modules/database/service.js";
import { StoreD1 } from "#modules/store/service.js";
import { JournalD1 } from "./service.ts";

describe("journal in D1, in workerd", () => {
  it("reads back, in order, the entries a commit wrote for one trace", async () => {
    const db = Database.d1(env.DB);
    const got = await Effect.runPromise(Effect.gen(function* () {
      const entry = (trace: string, subject: string) => ({ trace, operation: "allowance.grant", move: "grant", subject, event: "Granted", fields: { allowance: subject, limit: "5" } });
      yield* (yield* Store).commit({ writes: [], entries: [entry("tj1", "alw_a"), entry("tj2", "alw_b"), entry("tj1", "alw_c")] });
      return yield* (yield* Journal).ofTrace("tj1");
    }).pipe(Effect.provide(Layer.mergeAll(JournalD1.layer, StoreD1.layer({ tables: [] })).pipe(Layer.provide(db)))));
    expect(got.map((e) => e.subject)).toEqual(["alw_a", "alw_c"]);
    expect(got[0]!.fields).toEqual({ allowance: "alw_a", limit: "5" });
  });
});
