import { env } from "cloudflare:workers";
import { Effect, Layer, Tracer } from "effect";
import { SqlClient } from "effect/sql";
import { describe, expect, it } from "vitest";
import { Blueprint } from "@architect/blueprint";
import { BusyLive, Handlers, type Handler } from "@architect/target-effect";
import { Database } from "./service.ts";

const Allowance = Blueprint.thing({
  description: "Money a member may spend.",
  fields: { id: Blueprint.id("alw"), member: Blueprint.id("per"), limit: Blueprint.uint(128) },
});
const grant = Blueprint.operation(Allowance, {
  description: "Let a member spend, up to a limit.",
  payload: { member: Allowance.fields.member, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
});

describe("D1 through SqlClient, in workerd", () => {
  it("writes and reads a real D1 row", async () => {
    const rows = await Effect.runPromise(Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT INTO allowances (id, member, lim) VALUES ('alw_sql', 'per_olga', '500')`;
      return yield* sql`SELECT member, lim FROM allowances WHERE id = 'alw_sql'`;
    }).pipe(Effect.provide(Database.d1(env.DB))));
    expect(rows).toEqual([{ member: "per_olga", lim: "500" }]);
  });

  it("the handler wrapper runs in workerd: its step writes to D1 inside its own span", async () => {
    const handler: Handler<typeof grant, SqlClient.SqlClient> = (payload, { steps }) =>
      steps.insert(Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`INSERT INTO allowances (id, member, lim) VALUES ('alw_wrapped', ${payload.member}, ${payload.limit.toString()})`;
        return { allowance: "alw_wrapped" as never };
      }).pipe(Effect.orDie)); // a failing database is not a declared error: it dies, and the caller sees a 500
    const spans: Array<Tracer.NativeSpan> = [];
    const tracer = Tracer.make({ span: (o) => { const s = new Tracer.NativeSpan(o); spans.push(s); return s; } });
    const served = Handlers.serve({ name: "allowance.grant", operation: grant, handler });
    const answer = await Effect.runPromise(served.call({ member: "per_olga", limit: "340282366920938463463374607431768211455" }, { kind: "person", person: "per_ada" }).pipe(
      Effect.provide(Layer.mergeAll(Database.d1(env.DB), BusyLive, Layer.succeed(Tracer.Tracer, tracer))),
    ));
    expect(answer).toEqual({ allowance: "alw_wrapped" });
    const row = await env.DB.prepare("SELECT member, lim FROM allowances WHERE id = 'alw_wrapped'").first();
    expect(row).toEqual({ member: "per_olga", lim: "340282366920938463463374607431768211455" });
    const names = spans.map((s) => s.name);
    expect(names.slice(0, 2)).toEqual(["allowance.grant", "allowance.grant.insert"]);
    const sqlSpan = spans[2]!;
    expect(sqlSpan.parent._tag === "Some" && sqlSpan.parent.value.spanId).toBe(spans[1]!.spanId);
    expect(spans[0]!.attributes.get("payload.limit")).toBe("340282366920938463463374607431768211455");
  });
});
