// Everything the board shows that isn't stored: the join of Grid and Board, lane scores,
// the hill climb and "what changed". Pure functions; the page calls these and nothing else.
import { cellRole } from "./grid/types.ts";
import type {
  Block, Board, CardEvent, CardWork, Cell, CellId, CellRole, CellState, Grid, Output, OutputId, Question, Task, Thread,
} from "./types.ts";

export interface CardView {
  readonly cell: Cell;
  readonly output: Output;
  readonly state: CellState;              // the latest history event's state, else the grid's
  readonly task: Task | null;
  readonly thread: Thread | null;         // working it now
  readonly hadIt: ReadonlyArray<Thread>;  // threads that worked it before, oldest first, no repeats
  readonly history: ReadonlyArray<CardEvent>;
  readonly question: Question | null;     // Aaron's open call that decides this card, if any
  readonly waitsOn: ReadonlyArray<OutputId>; // outputs this one depends on that aren't green yet in its lane
  readonly role: CellRole;                 // from `cellRole(block, output)`: carries, an absence check, or not needed
  readonly because: string | null;         // the block's `audiencesBecause` when the role isn't "carries"
  readonly proposedNotNeeded: boolean;     // "proposed grey": red, role not-needed, and Q2 not yet answered "A"
  readonly notes: { readonly markdown: string; readonly stale: boolean }; // empty markdown when nobody wrote any
}

export interface Score {
  readonly green: number;
  readonly built: number;   // carried by the code, no verdict yet
  readonly partly: number;
  readonly red: number;
  readonly notNeeded: number;
  readonly needed: number; // all cards minus not-needed: what green is out of
}

export interface LaneView {
  readonly block: Block;
  readonly cards: ReadonlyArray<CardView>; // in output order
  readonly score: Score;
}

export interface BoardView {
  readonly goal: Grid["goal"];
  readonly asOf: string;
  readonly record: string;
  readonly story: Grid["story"];
  readonly questions: Grid["questions"];
  readonly illustrative: boolean;          // the history is made up for the prototype
  readonly outputs: ReadonlyArray<Output>;
  readonly lanes: ReadonlyArray<LaneView>; // in block order
  readonly score: Score;                   // the whole grid
  readonly tasks: ReadonlyArray<Task>;     // for an event's slice and its pull request
  readonly threads: ReadonlyArray<Thread>; // for an event's agent
  readonly repo: string | null;            // where pull requests live
}

const byOrder = <A extends { readonly order: number }>(xs: ReadonlyArray<A>): A[] =>
  [...xs].sort((a, b) => a.order - b.order);

export const stateNow = (cell: Cell, history: ReadonlyArray<CardEvent>): CellState =>
  history.length === 0 ? cell.state : history[history.length - 1]!.state;

/** The state a card was in at `at`: the last event at or before it, else the grid's baseline. */
export const stateAt = (cell: Cell, history: ReadonlyArray<CardEvent>, at: string): CellState =>
  history.filter((e) => e.at <= at).at(-1)?.state ?? cell.state;

export const score = (states: ReadonlyArray<CellState>): Score => {
  const count = (s: CellState) => states.filter((x) => x === s).length;
  const notNeeded = count("not-needed");
  return { green: count("green"), built: count("built"), partly: count("partly"), red: count("red"), notNeeded, needed: states.length - notNeeded };
};

const hadIt = (history: ReadonlyArray<CardEvent>, now: string | null, threads: ReadonlyMap<string, Thread>): Thread[] => {
  const ids = [...new Set(history.map((e) => e.thread).filter((t): t is string => t !== null && t !== now))];
  return ids.flatMap((id) => threads.get(id) ?? []);
};

export const join = (grid: Grid, board: Board): BoardView => {
  const work = new Map<CellId, CardWork>(board.cards.map((c) => [c.cell, c]));
  const tasks = new Map(board.tasks.map((t) => [t.id, t]));
  const threads = new Map(board.threads.map((t) => [t.id, t]));
  const cells = new Map(grid.cells.map((c) => [c.id, c]));
  const outputs = byOrder(grid.outputs);

  const questions = new Map(grid.questions.map((q) => [q.id, q]));

  const q2agreed = grid.questions.find((q) => q.id === "Q2")?.answer === "A";

  const card = (block: Block, cell: Cell, output: Output): CardView => {
    const role = cellRole(block, output);
    const w = work.get(cell.id);
    const history = w?.history ?? [];
    const thread = w?.thread ? threads.get(w.thread) ?? null : null;
    return {
      cell, output, history,
      state: stateNow(cell, history),
      task: w?.task ? tasks.get(w.task) ?? null : null,
      thread,
      hadIt: hadIt(history, thread?.id ?? null, threads),
      question: cell.question ? questions.get(cell.question) ?? null : null,
      waitsOn: [],
      role,
      because: role === "carries" ? null : block.audiencesBecause,
      proposedNotNeeded: role === "not-needed" && !q2agreed && stateNow(cell, history) === "red",
      notes: { markdown: w?.notes?.markdown ?? "", stale: !!w?.notes && w.notes.about !== grid.asOf },
    };
  };

  const lanes = byOrder(grid.blocks).map((block): LaneView => {
    const raw = outputs.flatMap((o) => {
      const cell = cells.get(`${block.id}.${o.id}`);
      return cell ? [card(block, cell, o)] : [];
    });
    const green = new Set(raw.filter((c) => c.state === "green").map((c) => c.output.id));
    const cards = raw.map((c) => ({ ...c, waitsOn: c.output.dependsOn.filter((d) => !green.has(d)) }));
    return { block, cards, score: score(cards.map((c) => c.state)) };
  });

  return {
    goal: grid.goal, asOf: grid.asOf, record: grid.record, story: grid.story, questions: grid.questions,
    illustrative: board.illustrative === true, outputs, lanes,
    score: score(lanes.flatMap((l) => l.cards.map((c) => c.state))),
    tasks: board.tasks, threads: board.threads, repo: board.repo ?? null,
  };
};

// ── The hill climb ─────────────────────────────────────────────────────────────────────────────

export interface ClimbPoint { readonly at: string; readonly score: Score }
export interface LaneClimb { readonly block: Block; readonly points: ReadonlyArray<ClimbPoint> }

/** Every distinct event time on the board, oldest first: the x axis of the climb. */
export const climbTimes = (board: Board): string[] =>
  [...new Set(board.cards.flatMap((c) => c.history.map((e) => e.at)))].sort();

/** Each lane's score at each time in `times`. The baseline (the grid's own states) comes first, at `asOf`. */
export const climb = (grid: Grid, board: Board, times: ReadonlyArray<string>): LaneClimb[] => {
  const histories = new Map(board.cards.map((c) => [c.cell, c.history]));
  return byOrder(grid.blocks).map((block) => {
    const cells = grid.cells.filter((c) => c.block === block.id);
    const at = (t: string | null): ClimbPoint => ({
      at: t ?? grid.asOf,
      score: score(cells.map((c) => (t === null ? c.state : stateAt(c, histories.get(c.id) ?? [], t)))),
    });
    return { block, points: [at(null), ...times.map(at)] };
  });
};

// ── What changed ───────────────────────────────────────────────────────────────────────────────

export interface Change {
  readonly cell: CellId;
  readonly from: CellState;
  readonly event: CardEvent;
}

/** Every event after `since`, newest first (ties by cell id), with the state it moved from. */
export const changedSince = (grid: Grid, board: Board, since: string): Change[] => {
  const cells = new Map(grid.cells.map((c) => [c.id, c]));
  return board.cards
    .flatMap((w) => w.history.flatMap((event, i): Change[] => {
      const cell = cells.get(w.cell);
      if (!cell || event.at <= since) return [];
      return [{ cell: w.cell, from: i === 0 ? cell.state : w.history[i - 1]!.state, event }];
    }))
    .sort((a, b) => b.event.at.localeCompare(a.event.at) || a.cell.localeCompare(b.cell));
};

// ── Filters ────────────────────────────────────────────────────────────────────────────────────

export interface Filter {
  readonly states?: ReadonlyArray<CellState>;
  readonly thread?: string;
  readonly output?: Output["id"];
}

export const matches = (c: CardView, f: Filter): boolean =>
  (!f.states || f.states.includes(c.state)) &&
  (!f.thread || c.thread?.id === f.thread) &&
  (!f.output || c.output.id === f.output);

/** The whole grid's score at point `i` of the climb: the sum of every lane's score there. */
export const scoreAt = (lanes: ReadonlyArray<LaneClimb>, i: number): Score => lanes.reduce<Score>((a, l) => {
  const s = l.points[i]!.score;
  return { green: a.green + s.green, built: a.built + s.built, partly: a.partly + s.partly, red: a.red + s.red, notNeeded: a.notNeeded + s.notNeeded, needed: a.needed + s.needed };
}, { green: 0, built: 0, partly: 0, red: 0, notNeeded: 0, needed: 0 });
