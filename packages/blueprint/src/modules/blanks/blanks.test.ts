import { describe, expect, it } from "vitest";
import { Blanks } from "./service.ts";

describe("blanks", () => {
  it("fit any slot and are found again", () => {
    const description: string = Blanks.todo("what the allowance is for");
    expect(Blanks.isBlank(description)).toBe(true);
    expect(Blanks.isBlank("written")).toBe(false);
  });
});
