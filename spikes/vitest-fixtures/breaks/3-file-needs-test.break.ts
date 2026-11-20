// Break 3: a file-scoped fixture that needs a test-scoped value (one warm world per planted kind, the kind set by test.scoped).
import { describe, expect, test as base } from "vitest";

const test = base.extend<{ kind: string; world: string }>({
  kind: "a",
  world: [async ({ kind }, use) => { await use(`world of ${kind}`); }, { scope: "file" }],
});

describe("kind b", () => {
  test.scoped({ kind: "b" });
  test("gets b's world", ({ world }) => { expect(world).toBe("world of b"); });
});
