// Spike: e2e/climb/climb.test.ts again, the same 26 tests and the same assertions, on fixtures and matchers.
import { describe, expect } from "vitest";
import { KINDS, essence, nothingRunning } from "../../e2e/climb/support.ts";
import { test } from "./fixtures.ts";
import "./matchers.ts";

describe("control: a correct handler", () => {
  test("passes every climb journey, so prove can go green here", ({ control }) => {
    expect(control.proved).toPassJourneys(KINDS.map((k) => k.journey));
    nothingRunning(control.root);
  });
});

for (const kind of KINDS) {
  describe(`planted: ${kind.label}`, () => {
    test.scoped({ kind });

    test("fails prove, and prove names the journey and the step that failed (1)", ({ ran }) => {
      expect(ran.first).toFailStep(kind);
    });

    test("shows what was expected and what came back (2)", ({ ran }) => {
      expect(ran.first).toSayExpectedAndGot({ ...kind, text: kind.expected });
    });

    test("points to the handler file and the declaration it answers to (3)", ({ ran }) => {
      expect(ran.first).toPointAt(kind);
    });

    test("finishes the journey in under 30 seconds, the world warm (4)", ({ ran }) => {
      expect(ran.first.seconds, `first run took ${ran.first.seconds.toFixed(1)}s`).toBeLessThan(30);
      expect(ran.second.seconds, `second run took ${ran.second.seconds.toFixed(1)}s`).toBeLessThan(30);
      nothingRunning(ran.root);
    });

    test("gives the same result on two runs in a row (5)", ({ ran }) => {
      expect(ran.second.status).toBe(ran.first.status);
      expect(essence(ran.second)).toEqual(essence(ran.first));
    });
  });
}
