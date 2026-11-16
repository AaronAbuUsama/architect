import { describe, expect, it } from "vitest";
import { Check } from "./service.ts";

describe("Check.blanks", () => {
  it("finds every Blueprint.todo with its line and what it waits for, grouped by its thing", () => {
    const blanks = Check.blanks([
      { path: "blueprint/things/allowance/thing.ts", text: 'a\n  description: Blueprint.todo("what it is"),\n' },
      { path: "blueprint/things/allowance/verbs/spend.ts", text: "x: Blueprint.todo<string>('who'), y: Blueprint.todo()" },
      { path: "blueprint/journeys/one.ts", text: "// no blanks" },
    ]);
    expect(blanks).toEqual([
      { file: "blueprint/things/allowance/thing.ts", line: 2, owner: "allowance", what: "what it is" },
      { file: "blueprint/things/allowance/verbs/spend.ts", line: 1, owner: "allowance", what: "who" },
      { file: "blueprint/things/allowance/verbs/spend.ts", line: 1, owner: "allowance", what: "(no description)" },
    ]);
    expect(Check.report(blanks).lines[0]).toBe("allowance has 3 blanks");
    expect(Check.report([])).toEqual({ lines: ["blanks left 0"], passed: true });
  });
});
