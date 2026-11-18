import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { PageRecords } from "./service.ts";

describe("profile record keys", () => {
  it("derives a stable key for each handle and each person", () => {
    expect(Effect.runSync(PageRecords.handleId("aaron"))).toBe("hdl_aaron");
    expect(Effect.runSync(PageRecords.profileId("per_aaron"))).toBe("prf_aaron");
  });
});
