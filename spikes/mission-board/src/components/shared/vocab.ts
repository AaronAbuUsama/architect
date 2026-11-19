// The board's words for states and stages, and the two switches Aaron's answers turn:
// what the columns mean (GRILL Q1) and where a card's detail opens (GRILL Q3).
import type { CardView, LaneView } from "../../data/derive.ts";
import type { CellState, Output, Task } from "../../data/types.ts";

export const stateWord: Record<CellState, string> = {
  red: "Red", partly: "Partly", built: "Built", green: "Green", "not-needed": "Not needed",
};

/** What each state means, said where it is used (style guide: define every word that judges). */
export const stateMeans: Record<CellState, string> = {
  red: "None of green-means holds yet",
  partly: "Some of green-means holds",
  built: "The code carries it; no verdict recorded yet",
  green: "Its evidence ran and passed",
  "not-needed": "Not needed, by Aaron's answer",
};

export type Tone = "danger" | "partly" | "warning" | "success" | "default";
export const stateTone: Record<CellState, Tone> = {
  red: "danger", partly: "partly", built: "warning", green: "success", "not-needed": "default",
};

/** HeroUI Chip has no orange, so a partly chip is the default chip with an orange dot (`.tone-partly`). */
export const chipColor = (t: Tone) => (t === "partly" ? "default" : t);

const stageWord: Record<Task["stage"], string> = {
  backlog: "Backlog", decide: "Decide", checks: "Checks", build: "Build", review: "Review", done: "Done",
};
export const stageOf = (c: CardView): Task["stage"] => c.task?.stage ?? "backlog";
export const stageName = (s: Task["stage"]) => stageWord[s];

// ── Switch 1: what the columns mean ────────────────────────────────────────────────────────────

export type ColumnsBy = "state" | "output" | "stage";
export interface Column { readonly id: string; readonly title: string; readonly tone: Tone }

const stateOrder: ReadonlyArray<CellState> = ["red", "partly", "built", "green", "not-needed"];

export const columnsFor = (by: ColumnsBy, outputs: ReadonlyArray<Output>, lanes: ReadonlyArray<LaneView>): Column[] => {
  if (by === "output") return outputs.map((o) => ({ id: o.id, title: o.name, tone: "default" }));
  if (by === "stage") {
    return (Object.keys(stageWord) as Task["stage"][]).map((s) => ({ id: s, title: stageWord[s], tone: s === "done" ? "success" : "default" }));
  }
  const any = new Set(lanes.flatMap((l) => l.cards.map((c) => c.state)));
  return stateOrder
    .filter((s) => s !== "not-needed" || any.has(s))
    .map((s) => ({ id: s, title: stateWord[s], tone: stateTone[s] }));
};

export const columnOf = (by: ColumnsBy, c: CardView): string =>
  by === "output" ? c.output.id : by === "stage" ? stageOf(c) : c.state;

// ── Switch 2: where a card's detail opens ──────────────────────────────────────────────────────

export type DetailAt = "panel" | "modal" | "page";
