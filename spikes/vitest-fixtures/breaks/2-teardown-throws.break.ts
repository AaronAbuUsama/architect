// Break 2: a file-scoped fixture's teardown throws (the "something is still running" case). Every test passed:
// does the run still fail, and does it say where?
import { expect, test as base } from "vitest";

const test = base.extend<{ world: string }>({
  // oxlint-disable-next-line no-empty-pattern
  world: [async ({}, use) => { await use("up"); throw new Error("left running: workerd 4242"); }, { scope: "file" }],
});

test("passes", ({ world }) => { expect(world).toBe("up"); });
