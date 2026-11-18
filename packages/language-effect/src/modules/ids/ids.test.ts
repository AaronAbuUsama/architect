import { Effect, Random } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Ids } from "./service.ts";

describe("Ids", () => {
  it("makes prefixed base-36 ids, the same ones from the same seed", async () => {
    const seeded = (seed: string) => Effect.runPromise(Ids.make("alw").pipe(Random.withSeed(seed)));
    const [a, b] = [await seeded("world"), await seeded("world")];
    expect(a).toMatch(/^alw_[0-9a-z]{16}$/);
    expect(a).toBe(b);
  });

  it("is always 16 characters: every draw lands inside the alphabet", async () => {
    // One draw in 37 used to pick past the end, and that id came out a character short.
    const ids = await Effect.runPromise(Effect.forEach(Array.from({ length: 2000 }), () => Ids.make("alw")).pipe(Random.withSeed("many")));
    expect(ids.filter((id) => !/^alw_[0-9a-z]{16}$/.test(id))).toEqual([]);
  });
});

describe("Ids.of", () => {
  it("takes the prefix from an id field", async () => {
    const Allowance = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("alw") } });
    expect(await Effect.runPromise(Ids.of(Allowance.fields.id))).toMatch(/^alw_/);
  });
});
