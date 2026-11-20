import { describe, expect, it } from "vitest";

describe("alpha", () => {
  it("passes", () => expect(1).toBe(1));
  it("is red until its slice lands", () => expect(1).toBe(2));
  it("is red too", () => expect(1).toBe(3));
});
