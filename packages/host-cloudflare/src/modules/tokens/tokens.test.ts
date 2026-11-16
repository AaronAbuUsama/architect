import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Principals } from "@architect/target-effect";
import { Tokens } from "./service.ts";

const principalOf = (authorization: string | undefined) =>
  Effect.runPromise(Effect.flatMap(Principals, (p) => p.of(authorization)).pipe(Effect.provide(Tokens.principals("s3cret"))));

describe("Tokens", () => {
  it("a token the world signed is that person; a forged or missing one is anonymous", async () => {
    const token = await Effect.runPromise(Tokens.sign("s3cret", "per_ada"));
    expect(await principalOf(`Bearer ${token}`)).toEqual({ kind: "person", person: "per_ada" });
    expect(await principalOf(`Bearer ${token.replace("per_ada", "per_bob")}`)).toEqual({ kind: "anonymous" });
    expect(await principalOf(undefined)).toEqual({ kind: "anonymous" });
  });
});
