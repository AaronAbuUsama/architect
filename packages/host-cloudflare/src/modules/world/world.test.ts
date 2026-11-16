import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Principals } from "@architect/target-effect";
import { AuthD1 } from "#modules/auth/service.ts";
import { toWorld } from "./service.ts";

const world = { worlds: env.WORLD, db: env.DB, tables: ["allowance"] };

const cast = (names: ReadonlyArray<string>, anonymous: ReadonlyArray<string> = []) =>
  toWorld(world, new Request("http://world/_world/cast", { method: "POST", body: JSON.stringify({ names, anonymous }) }))
    .then((r) => r.json() as Promise<Record<string, { person?: string; token?: string; email: string; password: string }>>);

describe("the world Durable Object, in workerd", () => {
  it("signs the cast up once through Better Auth, with tokens the Worker accepts; an anonymous member only gets credentials", { timeout: 30_000 }, async () => {
    const first = await cast(["ada", "olga"], ["newcomer"]);
    const again = await cast(["ada"]);
    expect(first["ada"]!.person).toMatch(/^per_[0-9a-z]{16}$/);
    expect(again["ada"]!.person).toBe(first["ada"]!.person);
    expect(first["olga"]!.person).not.toBe(first["ada"]!.person);
    const principal = await Effect.runPromise(
      Effect.flatMap(Principals, (p) => p.of(`Bearer ${again["ada"]!.token}`)).pipe(Effect.provide(AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET })))),
    );
    expect(principal).toEqual({ kind: "person", person: first["ada"]!.person, email: first["ada"]!.email });
    expect(first["newcomer"]).toEqual({ email: expect.stringMatching(/^newcomer\..+@world\.test$/), password: expect.any(String) });
  });

  it("answers health", async () => {
    expect((await toWorld(world, new Request("http://world/_world/health"))).status).toBe(200);
  });

  it("reads facts from the database: a row, and a trace's journal", async () => {
    await env.DB.prepare(`INSERT INTO "allowance" ("id", "member", "limit", "state") VALUES ('alw_f1', 'per_o', '5', 'active')`).run();
    await env.DB.prepare(`INSERT INTO "_journal" ("trace", "operation", "move", "subject", "event", "fields") VALUES ('t9', 'allowance.grant', 'grant', 'alw_f1', 'Granted', '{"allowance":"alw_f1"}')`).run();
    const row = await (await toWorld(world, new Request("http://world/_world/facts/record?table=allowance&id=alw_f1"))).json();
    expect(row).toMatchObject({ id: "alw_f1", state: "active" });
    const journal = await (await toWorld(world, new Request("http://world/_world/facts/journal?trace=t9"))).json();
    expect(journal).toEqual([expect.objectContaining({ event: "Granted", fields: { allowance: "alw_f1" } })]);
    expect((await toWorld(world, new Request("http://world/_world/facts/record?table=secrets&id=x"))).status).toBe(404);
  });
});
