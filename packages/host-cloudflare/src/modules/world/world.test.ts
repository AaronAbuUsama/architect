import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Principals } from "@architect/target-effect";
import { Tokens } from "#modules/tokens/service.ts";
import { toWorld } from "./service.ts";

const cast = (names: ReadonlyArray<string>) =>
  toWorld(env.WORLD, new Request("http://world/_world/cast", { method: "POST", body: JSON.stringify({ names }) }))
    .then((r) => r.json() as Promise<Record<string, { person: string; token: string }>>);

describe("the world Durable Object, in workerd", () => {
  it("casts people once and signs tokens the Worker accepts", async () => {
    const first = await cast(["ada", "olga"]);
    const again = await cast(["ada"]);
    expect(first["ada"]!.person).toMatch(/^per_[0-9a-z]{16}$/);
    expect(again["ada"]!.person).toBe(first["ada"]!.person);
    expect(first["olga"]!.person).not.toBe(first["ada"]!.person);
    const principal = await Effect.runPromise(
      Effect.flatMap(Principals, (p) => p.of(`Bearer ${first["ada"]!.token}`)).pipe(Effect.provide(Tokens.principals(env.WORLD_SECRET))),
    );
    expect(principal).toEqual({ kind: "person", person: first["ada"]!.person });
  });

  it("answers health", async () => {
    expect((await toWorld(env.WORLD, new Request("http://world/_world/health"))).status).toBe(200);
  });
});
