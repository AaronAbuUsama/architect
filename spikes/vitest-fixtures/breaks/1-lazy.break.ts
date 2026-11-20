// Break 1: is a file-scoped fixture really made only when a test asks for it, and only once?
import { expect, test as base } from "vitest";

let made = 0;
let unused = 0;
const test = base.extend<{ world: number; never: number }>({
  // oxlint-disable-next-line no-empty-pattern
  world: [async ({}, use) => { made++; await use(made); }, { scope: "file" }],
  // oxlint-disable-next-line no-empty-pattern
  never: [async ({}, use) => { unused++; await use(unused); }, { scope: "file" }],
});

test("asks for nothing: no fixture is made", () => { expect([made, unused]).toEqual([0, 0]); });
test("asks for world: made now", ({ world }) => { expect([world, made]).toEqual([1, 1]); });
test("asks again: the same one", ({ world }) => { expect([world, made]).toEqual([1, 1]); });
test("never was never made", () => { expect(unused).toBe(0); });
