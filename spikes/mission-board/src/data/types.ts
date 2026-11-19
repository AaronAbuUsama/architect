// The mission board's data model. Every word and number the board shows is a field here.
//
// Two owners, joined by a cell id (`<block>.<output>`, e.g. "visibility.api"):
//   Grid  — what each cell means. Owned by the grid thread (design/grid/grid.json, design/grid/types.ts).
//           Changes by pull request. Static between merges.
//   Board — who is on each cell and how it moved. Owned by the conductor (the board's shared database).
//           Changes live, many times a day.
// The page joins them; nothing is computed into either file that the page can derive (lane scores,
// "what changed since", hill-climb points are all derived from `cells` + `history`).

// ── Grid (design/grid/grid.json) ──────────────────────────────────────────────────────────────

export type BlockId =
  | "thing" | "operation" | "step" | "machine" | "event" | "error" | "roles"
  | "visibility" | "environment" | "store" | "mount" | "device" | "journey";

export type OutputId = "model" | "api" | "server" | "sdk" | "cli" | "mcp" | "docs" | "portal" | "telemetry";

export type CellId = `${BlockId}.${OutputId}`;

/** green: the eval passes. partly: some of green-means holds. red: it does not. not-needed: by design, with a reason. */
export type CellState = "green" | "partly" | "red" | "not-needed";

export interface Grid {
  readonly goal: Goal;
  readonly blocks: ReadonlyArray<Block>;   // swim lanes, in `order`
  readonly outputs: ReadonlyArray<Output>; // card slots in every lane, in `order`
  readonly cells: ReadonlyArray<Cell>;     // blocks × outputs; a missing cell is a schema error
  readonly asOf: string;                   // the commit or audit the states were read from, e.g. "m1@56ea4b31"
}

export interface Goal {
  readonly title: string;
  readonly writeUp: ReadonlyArray<string>; // paragraphs, plain words; carries no number the page doesn't show
  readonly doneWhen: string;               // the single check that ends the goal
}

export interface Block {
  readonly id: BlockId;
  readonly name: string;      // "Field visibility"
  readonly summary: string;   // one line under the lane name: what the block is in a blueprint
  readonly order: number;
  readonly endState: EndState;
}

/** What proves the whole lane: usually a portal view, otherwise a journey through cli/sdk/mcp. */
export interface EndState {
  readonly kind: "portal-view" | "journey";
  readonly title: string;      // "Secret fields marked in the Thing page"
  readonly description: string;
  readonly ref: string | null; // the view's route or the journey's path, once it exists
}

export interface Output {
  readonly id: OutputId;
  readonly name: string;                         // "MCP"
  readonly provedBy: "check" | "portal" | "journey"; // how a card in this column gets its evidence
  readonly order: number;
}

export interface Cell {
  readonly id: CellId;
  readonly block: BlockId;
  readonly output: OutputId;
  readonly state: CellState;              // as of `Grid.asOf`; the board's history moves it after that
  readonly greenMeans: string | null;     // the eval, in one sentence; null = not written yet (shown as a gap)
  readonly notNeededBecause: string | null; // required when state is "not-needed"
  readonly todayRef: string | null;       // file:line where today's behaviour lives
  readonly evidence: ReadonlyArray<Evidence>;
}

export interface Evidence {
  readonly kind: "eval" | "check" | "journey" | "file" | "pr";
  readonly label: string;
  readonly ref: string;           // path, path:line, eval id or PR number
  readonly passing: boolean | null; // null = not run yet
}

// ── Board (the conductor's database; tasks and threads keep the kanban skill's schema) ─────────

export interface Board {
  readonly cards: ReadonlyArray<CardWork>;
  readonly tasks: ReadonlyArray<Task>;
  readonly threads: ReadonlyArray<Thread>;
}

/** The live layer over one grid cell. One per cell; a cell nobody has touched has an empty history. */
export interface CardWork {
  readonly cell: CellId;
  readonly task: string | null;   // Task.id of the slice that owns it now ("M1-35")
  readonly thread: string | null; // Thread.id working it now
  readonly history: ReadonlyArray<CardEvent>; // appended, never rewritten; oldest first
}

/** A move on a card. State changes drive the hill climb; thread changes drive "had it before". */
export interface CardEvent {
  readonly at: string;            // ISO time from `date -u`
  readonly state: CellState;      // the state after this event
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
