import { describe, expect, it } from "vitest";
import { NAV, sections } from "./internal/nav.ts";

describe("shell navigation", () => {
  it("groups entries by section in F2's order, each section once, none empty", () => {
    const grouped = sections(NAV);
    expect(grouped.map(([s]) => s)).toEqual(["start", "reference", "proof", "work", "read"]);
    expect(grouped.every(([, items]) => items.length > 0)).toBe(true);
    expect(grouped.flatMap(([, items]) => items)).toHaveLength(NAV.length);
  });

  it("gives every entry its own key and address", () => {
    expect(new Set(NAV.map((i) => i.key)).size).toBe(NAV.length);
    expect(new Set(NAV.map((i) => i.href)).size).toBe(NAV.length);
  });
});
