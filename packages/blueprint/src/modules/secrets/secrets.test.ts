import { describe, expect, it } from "vitest";
import { Secrets } from "./service.ts";

describe("secrets", () => {
  it("are named, with how they get a value and no value", () => {
    expect(Secrets.secret.generated()).toEqual({ kind: "secret", how: "generated" });
    expect(Secrets.secret.stored()).toEqual({ kind: "secret", how: "stored" });
  });
});
