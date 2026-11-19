// Run: node --test spikes/mission-board/src/data/derive.test.ts
import { deepEqual, equal } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { changedSince, climb, climbTimes, join, matches } from "./derive.ts";
import type { Board, CellState, Grid } from "./types.ts";

const load = <A>(name: string): A => JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8")) as A;
const grid = load<Grid>("./grid.fixture.json");
const board = load<Board>("./board.fixture.json");
const moved = load<Board>("./board.illustrative.json");

test("every lane has a card for every output, in order", () => {
  const view = join(grid, board);
  equal(view.lanes.length, 13);
  for (const lane of view.lanes) deepEqual(lane.cards.map((c) => c.output.id), view.outputs.map((o) => o.id));
});

test("with no history, the board shows the grid's states and the audit's totals", () => {
  const view = join(grid, board);
  deepEqual(view.score, { green: 44, partly: 24, red: 49, notNeeded: 0, needed: 117 });
  const vis = view.lanes.find((l) => l.block.id === "visibility")!;
  deepEqual(vis.cards.map((c) => c.state), ["green", "red", "red", "red", "partly", "green", "partly", "red", "green"]);
});

test("a card links to its task and the thread on it now", () => {
  const api = join(grid, board).lanes.find((l) => l.block.id === "visibility")!.cards.find((c) => c.output.id === "api")!;
  equal(api.task?.ref, "M1.35");
  equal(api.thread?.id, "m1-lead");
  equal(api.cell.todayRef, "packages/projections/src/modules/api/internal/api.ts:81");
});

test("history moves a card: the latest event wins", () => {
  const vis = join(grid, moved).lanes.find((l) => l.block.id === "visibility")!;
  equal(vis.cards.find((c) => c.output.id === "api")!.state, "green");
  deepEqual(vis.score, { green: 5, partly: 2, red: 2, notNeeded: 0, needed: 9 });
});

test("threads that had a card before are listed once, without the current one", () => {
  const b: Board = { ...moved, cards: moved.cards.map((c) => c.cell !== "step.sdk" ? c : {
    ...c, history: [{ at: "2026-11-19T10:00:00Z", state: "red" as CellState, thread: "m1-lead", task: "M1-12", evidence: null, note: "x" }, ...c.history],
  }) };
  const sdk = join(grid, b).lanes.find((l) => l.block.id === "step")!.cards.find((c) => c.output.id === "sdk")!;
  equal(sdk.thread?.id, "codex-links");
  deepEqual(sdk.hadIt.map((t) => t.id), ["m1-lead"]);
});

test("the climb starts at the grid's baseline and rises with each event", () => {
  const times = climbTimes(moved);
  equal(times.length, 5);
  const vis = climb(grid, moved, times).find((l) => l.block.id === "visibility")!;
  deepEqual(vis.points.map((p) => p.score.green), [3, 3, 3, 3, 5, 5]);
  equal(vis.points[0]!.at, grid.asOf);
});

test("what changed lists moves after a time, newest first, with the state each came from", () => {
  const changes = changedSince(grid, moved, "2026-11-19T12:00:00Z");
  deepEqual(changes.map((c) => c.cell), ["journey.cli", "visibility.api", "visibility.sdk", "step.sdk"]);
  deepEqual(changes.map((c) => c.from), ["red", "partly", "red", "red"]);
});

test("filters by state, thread and output", () => {
  const cards = join(grid, moved).lanes.flatMap((l) => l.cards);
  equal(cards.filter((c) => matches(c, { states: ["red"] })).length, 44);
  equal(cards.filter((c) => matches(c, { thread: "codex-links" })).length, 2);
  equal(cards.filter((c) => matches(c, { output: "mcp", states: ["red"] })).length, 8);
});
