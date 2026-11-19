// The climb recorder's parser, against lines `ortho prove` really printed (captured from runs on acme and the climb fixtures).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { entries, journeys } from "../../tools/climb/parse.mjs";

const sample = readFileSync(join(import.meta.dirname, "../fixtures/climb/prove-sample.txt"), "utf8");

describe("the climb recorder's parser", () => {
  it("reads one entry per journey line, red or green, with names that hold colons", () => {
    expect(journeys(sample)).toEqual([
      { journey: "spend within an allowance", green: 1, total: 4 },
      { journey: "climb: a wrong answer", green: 0, total: 1 },
      { journey: "revoke then spend", green: 3, total: 3 },
    ]);
  });
  it("ignores step lines and eval lines, and output with no journey", () => {
    expect(journeys("  ✘ \"x\": journey a ✔ 1/1 steps\nallowance.get coverage ✘ no\n")).toEqual([]);
    expect(journeys("")).toEqual([]);
  });
  it("makes the lines to append, each carrying the run's time, commit and exit", () => {
    const lines = entries({ output: sample, at: "2026-11-19T17:00:00.000Z", commit: "abc", seconds: 9.6, exit: 1 });
    expect(lines).toHaveLength(3);
    expect(lines[1]).toEqual({ at: "2026-11-19T17:00:00.000Z", commit: "abc", journey: "climb: a wrong answer", green: 0, total: 1, seconds: 9.6, exit: 1 });
  });
});
