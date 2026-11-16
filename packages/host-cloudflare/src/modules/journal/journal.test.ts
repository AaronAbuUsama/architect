import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { Journal } from "@architect/target-effect";
import { Database } from "#modules/database/service.ts";
import { JournalD1 } from "./service.ts";

describe("journal in D1, in workerd", () => {
  it("writes entries and reads a trace's back in order", async () => {
    const got = await Effect.runPromise(Effect.gen(function* () {
      const journal = yield* Journal;
      const entry = (trace: string, subject: string) => ({ trace, operation: "allowance.grant", move: "grant", subject, event: "Granted", fields: { allowance: subject, limit: "5" } });
      yield* journal.record(entry("tj1", "alw_a"));
      yield* journal.record(entry("tj2", "alw_b"));
      yield* journal.record(entry("tj1", "alw_c"));
      return yield* journal.ofTrace("tj1");
    }).pipe(Effect.provide(JournalD1.layer.pipe(Layer.provide(Database.d1(env.DB))))));
    expect(got.map((e) => e.subject)).toEqual(["alw_a", "alw_c"]);
    expect(got[0]!.fields).toEqual({ allowance: "alw_a", limit: "5" });
  });
});
