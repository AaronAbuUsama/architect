// This guards only partial-stage readiness. Every listed suite must still run its own real assertions.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("Gate 3 remains incomplete until the remaining step-specific author suites exist", () => {
  const required = ["05-wallets-auth.test.ts", "06-chain-worlds.test.ts", "07-relay-and-simulation.test.ts",
    "08-follower.test.ts", "09-delegation.test.ts", "10-whole-acme.test.ts"];
  const absent = required.filter((file) => !existsSync(join(import.meta.dirname, file)));
  expect(absent, "These later public contracts/checks are pending; current L3.01 readiness is not a complete Gate 3").toEqual([]);
});
