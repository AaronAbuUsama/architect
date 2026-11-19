// The baseline: tally lint reports, compare them with what is allowed, shrink what is allowed, render it as stable text.
import { describe, expect, it } from "vitest";
import { Baseline } from "./service.ts";
import type { Counts } from "./types.ts";

describe("Baseline.count", () => {
  it("tallies reports per rule and path", () => {
    expect(Baseline.count([
      { rule: "max-lines", path: "b.ts" }, { rule: "effect-only", path: "a.ts" },
      { rule: "effect-only", path: "a.ts" }, { rule: "effect-only", path: "b.ts" },
    ])).toEqual({ "effect-only": { "a.ts": 2, "b.ts": 1 }, "max-lines": { "b.ts": 1 } });
  });

  it("gives nothing for no reports", () => {
    expect(Baseline.count([])).toEqual({});
  });
});

describe("Baseline.compare", () => {
  it("equal counts are neither over nor stale", () => {
    const c: Counts = { r: { "a.ts": 2 } };
    expect(Baseline.compare(c, c)).toEqual({ over: [], stale: [] });
  });

  it("more than allowed is over; fewer is stale", () => {
    expect(Baseline.compare({ r: { "a.ts": 1, "b.ts": 3 } }, { r: { "a.ts": 2, "b.ts": 1 } })).toEqual({
      over: [{ rule: "r", path: "a.ts", allowed: 1, actual: 2 }],
      stale: [{ rule: "r", path: "b.ts", allowed: 3, actual: 1 }],
    });
  });

  it("a path or rule absent from the baseline counts 0 allowed; absent from actual counts 0 actual", () => {
    expect(Baseline.compare({ old: { "gone.ts": 2 } }, { fresh: { "new.ts": 1 } })).toEqual({
      over: [{ rule: "fresh", path: "new.ts", allowed: 0, actual: 1 }],
      stale: [{ rule: "old", path: "gone.ts", allowed: 2, actual: 0 }],
    });
  });

  it("sorts by rule, then path", () => {
    const v = Baseline.compare({}, { b: { "z.ts": 1, "a.ts": 1 }, a: { "m.ts": 1 } });
    expect(v.over.map((x) => `${x.rule} ${x.path}`)).toEqual(["a m.ts", "b a.ts", "b z.ts"]);
  });
});

describe("Baseline.shrink", () => {
  it("lowers each entry to what is left", () => {
    expect(Baseline.shrink({ r: { "a.ts": 5, "b.ts": 2 } }, { r: { "a.ts": 3, "b.ts": 2 } })).toEqual({ r: { "a.ts": 3, "b.ts": 2 } });
  });

  it("drops zeros and rules left empty", () => {
    expect(Baseline.shrink({ r: { "a.ts": 2 }, s: { "b.ts": 1, "c.ts": 4 } }, { s: { "c.ts": 1 } })).toEqual({ s: { "c.ts": 1 } });
  });

  it("never adds an entry or raises one", () => {
    expect(Baseline.shrink({ r: { "a.ts": 1 } }, { r: { "a.ts": 9, "new.ts": 2 }, fresh: { "x.ts": 1 } })).toEqual({ r: { "a.ts": 1 } });
  });
});

describe("Baseline.render", () => {
  it("sorts rules and paths by code point, with 2-space JSON and a trailing newline", () => {
    expect(Baseline.render({ b: { z: 1, a: 2 }, a: { m: 3 }, B: { x: 1 } })).toBe(
      '{\n  "B": {\n    "x": 1\n  },\n  "a": {\n    "m": 3\n  },\n  "b": {\n    "a": 2,\n    "z": 1\n  }\n}\n',
    );
  });

  it("is stable whatever order the input came in", () => {
    expect(Baseline.render({ r: { "b.ts": 1, "a.ts": 2 } })).toBe(Baseline.render({ r: { "a.ts": 2, "b.ts": 1 } }));
  });

  it("renders no counts as an empty object", () => {
    expect(Baseline.render({})).toBe("{}\n");
  });
});
