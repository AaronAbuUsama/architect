// The mission board's data model. Every word and number the board shows is a field here or in the grid.
//
// Two owners, joined by a cell id (`<block>.<output>`, e.g. "visibility.api"):
//   Grid  — what each cell means: `./grid/types.ts` and `./grid/grid.json`, copied from `design/grid/` on PR #72
//           (claude/design-the-grid-0a401d at fa911f30). Owned by the grid thread; changes by pull request.
//           Once #72 merges, import `design/grid/` directly and delete the copy.
//   Board — this file: who is on each cell and how it moved. Owned by the conductor (the board's database).
// Nothing derivable is stored in either: lane scores, "what changed since" and the hill climb come from `derive.ts`.
import type { CellId, CellState } from "./grid/types.ts";

export type * from "./grid/types.ts";

export interface Board {
  readonly illustrative?: true;   // set only on the prototype's made-up history; the page says so when it is
  readonly cards: ReadonlyArray<CardWork>;
  readonly tasks: ReadonlyArray<Task>;
  readonly threads: ReadonlyArray<Thread>;
}

/** The live layer over one grid cell. A cell with no CardWork has nobody on it and has never moved. */
export interface CardWork {
  readonly cell: CellId;
  readonly task: string | null;   // Task.id of the slice on it now ("M1-35"); the grid's `owner` is the plan
  readonly thread: string | null; // Thread.id working it now
  readonly history: ReadonlyArray<CardEvent>; // appended, never rewritten; oldest first
  /** People's notes on the card, markdown, like an operation's notes in the portal workspace. Optional: none yet. */
  readonly notes?: CardNotes;
}

/** Notes saved beside a card, stamped with the grid commit they were written against, so they can go stale. */
export interface CardNotes {
  readonly markdown: string;
  readonly about: string; // the grid's `asOf` when written; differs from today's asOf → stale
}

/** A move on a card. State changes drive the hill climb; thread changes drive "had it before". */
export interface CardEvent {
  readonly at: string;            // ISO time from `date -u`
  readonly state: CellState;      // the state after this event; built → green when a verdict lands
  readonly thread: string | null;
  readonly task: string | null;
  readonly evidence: string | null; // Evidence.ref that justified the move
  readonly note: string;
}

/** As in the kanban skill: tasks/<id>. Only the fields the board reads are listed. */
export interface Task {
  readonly id: string;    // "M1-35"
  readonly ref: string;   // "M1.35"
  readonly title: string;
  readonly stage: "backlog" | "decide" | "checks" | "build" | "review" | "done";
  readonly thread: string | null;
  readonly pr: number | null;
}

/** As in the kanban skill: threads/<id>. */
export interface Thread {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly kind: "person" | "claude" | "codex" | "subagent";
  readonly status: string;
  readonly sessionId: string | null;
  readonly branch: string | null;
  readonly pr: number | null;
}
