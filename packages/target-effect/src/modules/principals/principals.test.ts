import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Principals } from "./types.ts";
import { PrincipalsAnonymous } from "./service.ts";

describe("Principals", () => {
  it("anonymous whatever the header says", async () => {
    const p = await Effect.runPromise(Effect.flatMap(Principals, (ps) => ps.of("Bearer whatever")).pipe(Effect.provide(PrincipalsAnonymous)));
    expect(p).toEqual({ kind: "anonymous" });
  });
});
