import { Effect, Random } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "@architect/blueprint";
import { Ids } from "./service.ts";

describe("Ids", () => {
  it("makes prefixed base-36 ids, the same ones from the same seed", async () => {
    const seeded = (seed: string) => Effect.runPromise(Ids.make("alw").pipe(Random.withSeed(seed)));
    const [a, b] = [await seeded("world"), await seeded("world")];
    expect(a).toMatch(/^alw_[0-9a-z]{16}$/);
    expect(a).toBe(b);
  });
});

describe("Ids.of", () => {
  it("takes the prefix from an id field", async () => {
    const Allowance = Blueprint.thing({ description: "Money.", fields: { id: Blueprint.id("alw") } });
    expect(await Effect.runPromise(Ids.of(Allowance.fields.id))).toMatch(/^alw_/);
  });
});
