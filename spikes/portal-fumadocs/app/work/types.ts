// The Work area's shapes: what the Plan, Manager and Run Durable Objects would serve (brief F4 §8). Made-up data fills them.

/** The six kinds generated from the blueprint, plus the spike that intake adds. */
export type Kind = "specify" | "design machine" | "validate machine" | "build" | "prove" | "promote" | "spike";
/** Board columns, all derived from facts: nobody drags a card. */
export type Column = "open" | "running" | "waiting" | "proven" | "done";

export type WorkerType = {
  id: string; name: string; does: string; kinds: Kind[];
  /** Every model this type may run on; the manager picks one per run, and the run records which. */
  models: string[];
  skills: string[]; mcps: string[]; tools: string[]; sandbox: string | null; budgetUsd: number; file: string;
  /** Hard stops on one thread; the manager is told when one trips. */
  limits: { maxTurns: number; timeoutMin: number; parallel: number };
  /** What it must ask its manager (and so you) before doing. */
  asks: string[];
};

export type Mission = {
  id: string; title: string; hue: [string, string]; until: string; started: string; status: "running" | "idle" | "done";
  milestones: Array<{ title: string; kinds: Kind[]; of: string }>;
  /** One value per day, oldest first: what the burn-down and the sparklines draw. */
  daily: { day: string[]; open: number[]; scope: number[]; spend: number[]; toolFail: number[]; evalPass: number[]; closed: number[]; closeMin: number[] };
};

export type Task = {
  id: string; mission: string; milestone: string; kind: Kind; subject: string; column: Column;
  /** The fact that closes it, in words. */
  closesWhen: string; note?: string; reopened?: string; runs: string[];
  /** Progress towards the closing fact, when it is countable (evals passing, blanks gone). */
  progress?: [done: number, of: number];
};

export type RunEvent =
  | { at: number; kind: "turn"; n: number; tokensIn: number; tokensOut: number; cached: number; text: string }
  | { at: number; kind: "tool"; name: string; args: string; ok: boolean; ms: number; error?: string; input?: Record<string, unknown>; output?: string; lang?: string }
  | { at: number; kind: "command"; cmd: string; exit: number; ms: number; tail?: string; out?: string }
  | { at: number; kind: "edit"; file: string; added: number; removed: number; diff?: string }
  | { at: number; kind: "report"; report: "progress" | "waiting" | "ready" | "blocked" | "failed"; text: string }
  | { at: number; kind: "resume"; text: string };

export type Run = {
  id: string; task: string; worker: string; model: string; status: "running" | "passed" | "failed" | "stopped";
  started: string; seconds: number; costUsd: number; sandbox: string; sandboxUp: boolean; events: RunEvent[];
};

/** A recorded fact about an operation, from the logbook or the plan, ordered by seq. */
export type Fact = { seq: number; at: string; subject: string; kind: "compiled" | "claimed" | "evals" | "verdict" | "release" | "spike"; text: string; tone?: "good" | "bad" };
