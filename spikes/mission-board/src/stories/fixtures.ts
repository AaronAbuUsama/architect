// The stories' data: the real fixtures run through derive.ts, and the real cells picked for each state a story shows.
// Only stories import this; components take derived data as props and never reach into the fixtures.
import type { BoardView, CardView, LaneView } from "../data/derive.ts";
import { changedSince, climb, climbTimes, join } from "../data/derive.ts";
import type { Board, CellId, Grid } from "../data/types.ts";
import { columnsFor } from "../components/shared/vocab.ts";
import realBoard from "../data/board.fixture.json" with { type: "json" };
import madeUpBoard from "../data/board.illustrative.json" with { type: "json" };
import gridData from "../data/grid/grid.json" with { type: "json" };

export const grid = gridData as unknown as Grid;
export const real = realBoard as unknown as Board;
export const madeUp = madeUpBoard as unknown as Board;

/** The board as it is: no moves recorded since the grid was graded. */
export const now: BoardView = join(grid, real);
/** The same board with eight made-up moves, so green cards, history and a climb exist to look at. */
export const later: BoardView = join(grid, madeUp);

export const laneOf = (v: BoardView, cell: CellId): LaneView => v.lanes.find((l) => l.cards.some((c) => c.cell.id === cell))!;
export const cardOf = (v: BoardView, cell: CellId): CardView => laneOf(v, cell).cards.find((c) => c.cell.id === cell)!;
export const lane = (v: BoardView, block: string): LaneView => v.lanes.find((l) => l.block.id === block)!;

/** The real cells each story shows, so a story names the state it is for. */
export const pick = {
  red: "visibility.api",
  built: "operation.model",
  partly: "operation.portal",
  green: "operation.api",          // green only in the made-up history
  proposedGrey: "step.sdk",        // red, with a not-needed proposal waiting on K14's Q2
  waiting: "error.portal",         // waits on model, docs and telemetry
  history: "error.telemetry",      // two made-up moves and a thread that had it before
} as const satisfies Record<string, CellId>;

export const stateColumns = columnsFor("state", now.outputs, now.lanes);
export const outputColumns = columnsFor("output", now.outputs, now.lanes);
export const stageColumns = columnsFor("stage", now.outputs, now.lanes);

export const laterClimb = climb(grid, madeUp, climbTimes(madeUp));
export const nowClimb = climb(grid, real, climbTimes(real));
export const laterChanges = changedSince(grid, madeUp, "");
