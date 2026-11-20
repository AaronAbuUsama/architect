// Break 4: one file-scoped fixture per kind, made in a loop, asked for by a computed name.
import { expect, test as base } from "vitest";

const kinds = ["wrongAnswer", "missingEvent"] as const;
const made: Array<string> = [];
const test = base.extend<Record<(typeof kinds)[number], string>>(
  // oxlint-disable-next-line no-empty-pattern
  Object.fromEntries(kinds.map((k) => [k, [async ({}: object, use: (v: string) => Promise<void>) => { made.push(k); await use(k); }, { scope: "file" }]])) as never,
);

for (const k of kinds) test(`${k}: asked for by a computed name`, ({ [k]: world }) => { expect(world).toBe(k); });
test("static name still works", ({ wrongAnswer }) => { expect(wrongAnswer).toBe("wrongAnswer"); });
