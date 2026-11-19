import assert from "node:assert/strict";
import { test } from "node:test";
import { apply, type Board, refuse } from "./board.ts";

const ada = { kind: "person", name: "ada" } as const;
const bot = { kind: "agent", name: "builder-1" } as const;
const item = (id: string, column: Board["items"][number]["column"], touches: string[], extra = {}) =>
  ({ id, title: id, column, lane: "agent", touches, needs: [], ...extra }) as Board["items"][number];

test("the machine refuses a skipped column", () => {
  const b: Board = { items: [item("a", "backlog", ["x"])], limits: {} };
  assert.deepEqual(refuse(b, "a", "review", ada, 0), { code: "MoveNotAllowed", from: "backlog", to: "review" });
});

test("nobody drags a card into done: only a fact closes it", () => {
  const b: Board = { items: [item("a", "review", ["x"])], limits: {} };
  assert.deepEqual(refuse(b, "a", "done", ada, 0), { code: "OnlyAFactCloses" });
});

test("two running items may not touch the same file", () => {
  const b: Board = { items: [item("a", "running", ["src/x.ts"]), item("b", "ready", ["src/x.ts", "y"])], limits: {} };
  assert.deepEqual(refuse(b, "b", "running", bot, 0), { code: "FilesBusy", files: ["src/x.ts"], by: "a" });
});

test("the running column's limit is the concurrency limit", () => {
  const b: Board = { items: [item("a", "running", ["1"]), item("b", "ready", ["2"])], limits: { running: 1 } };
  assert.deepEqual(refuse(b, "b", "running", bot, 0), { code: "ColumnFull", column: "running", limit: 1 });
});

test("a live lease belongs to its holder; an expired one to anyone", () => {
  const b = apply({ items: [item("a", "ready", ["1"])], limits: {} }, "a", "running", bot, 0);
  assert.deepEqual(refuse(b, "a", "review", ada, 1), { code: "ItemLeased", holder: "builder-1" });
  assert.equal(refuse(b, "a", "review", ada, 11 * 60_000), undefined);
});

test("an item waits for what it needs", () => {
  const b: Board = { items: [item("a", "review", ["1"]), item("b", "ready", ["2"], { needs: ["a"] })], limits: {} };
  assert.deepEqual(refuse(b, "b", "running", bot, 0), { code: "NeedsOpen", open: ["a"] });
});
