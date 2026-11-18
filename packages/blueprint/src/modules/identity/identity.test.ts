import { describe, expect, it } from "vitest";
import { Identity } from "./service.ts";

describe("identity", () => {
  it("is test principals or Better Auth", () => {
    expect([Identity.testPrincipals.which, Identity.betterAuth.which]).toEqual(["test-principals", "better-auth"]);
  });
});
