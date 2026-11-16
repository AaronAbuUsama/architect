// Eval 7 (performance, review only) and eval 8 (coverage: each operation's, and the run's in one line).
import type { Model, OperationModel } from "@architect/compiler";
import type { Evidence, PerOperation, Verdict } from "../types.ts";
import { answered, attr } from "./evidence.ts";

const percentile = (sorted: ReadonlyArray<number>, p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
const ms = (n: number) => `${Math.round(n)}ms`;

/** 7. p50 and p95 of the operation's spans against its budget. Over 1.5 times the budget is a review, never a failure. */
export const performance: PerOperation = (op, evidence) => {
  const times = evidence.flatMap((e) => (e.opSpan ? [e.opSpan.ms] : [])).sort((a, b) => a - b);
  const budget = op.budget?.p95Ms;
  if (times.length === 0) return { eval: "performance", operation: op.name, failures: [], notes: ["no timed calls"] };
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const notes = [`p50 ${ms(p50)} p95 ${ms(p95)}${budget === undefined ? " (no budget)" : ` budget p95 ${ms(budget)}`}`];
  if (budget !== undefined && p95 > 1.5 * budget) notes.push(`review: p95 ${ms(p95)} is over 1.5x budget`);
  return { eval: "performance", operation: op.name, failures: [], notes };
};

type Sets = ReturnType<typeof reachedIn>;

/** What the whole run reached: operations called, moves made, outcomes reached, refusals given. */
const reachedIn = (model: Model, evidence: ReadonlyArray<Evidence>) => {
  const thingOf = (e: Evidence) => model.operations[e.call.operation]?.thing;
  const moving = evidence.filter((e) => answered(e) && attr(e, "move.to") !== undefined);
  return {
    called: new Set(evidence.map((e) => e.call.operation)),
    moved: new Set(moving.map((e) => `${thingOf(e)}.${model.operations[e.call.operation]?.move?.key}`)),
    reached: new Set(moving.map((e) => `${thingOf(e)}:${String(attr(e, "move.to"))}`)),
    refused: new Set(evidence.flatMap((e) => (e.refusal ? [`${e.call.operation}:${e.refusal}`] : []))),
  };
};

const required = (op: OperationModel) => ({
  move: op.move ? [`${op.thing}.${op.move.key}`] : [],
  outcomes: op.move ? op.move.to.map((s) => `${op.thing}:${s}`) : [],
  errors: op.errors.map((x) => `${op.name}:${x}`),
  runtime: op.refusals.filter((r) => !op.errors.includes(r)).map((r) => `${op.name}:${r}`),
});

const gaps = (op: OperationModel, sets: Sets) => {
  if (!sets.called.has(op.name)) return [`${op.name} reached by no journey`];
  const r = required(op);
  return [
    ...r.move.filter((m) => !sets.moved.has(m)).map((m) => `move ${m} made by no journey`),
    ...r.outcomes.filter((s) => !sets.reached.has(s)).map((s) => `outcome ${s.replace(":", " ")} reached by no journey`),
    ...r.errors.filter((x) => !sets.refused.has(x)).map((x) => `${x.replace(":", " refusing ")} reached by no journey`),
  ];
};

/**
 * 8. Coverage, per operation: called by some journey or starting world, its move made, every outcome reached and every
 * declared error refused. The runtime's own refusals (NotAllowed, the machine's) are counted but never required.
 */
export const coverage: PerOperation = (op, _mine, { project, all }) => {
  const failures = gaps(op, reachedIn(project.model, all));
  return { eval: "coverage", operation: op.name, failures, notes: [] };
};

/** The run's coverage in one line: what was reached of everything declared. It never fails; each operation's does. */
export const coverageSummary = (model: Model, evidence: ReadonlyArray<Evidence>): Verdict => {
  const sets = reachedIn(model, evidence);
  const all = Object.values(model.operations).map(required);
  const count = (xs: ReadonlyArray<string>, hit: ReadonlySet<string>) => `${xs.filter((x) => hit.has(x)).length}/${xs.length}`;
  const flat = (k: keyof ReturnType<typeof required>) => [...new Set(all.flatMap((r) => r[k]))];
  const notes = [`moves ${count(flat("move"), sets.moved)} · outcomes ${count(flat("outcomes"), sets.reached)} · refusals ${count(flat("errors"), sets.refused)} · runtime refusals ${count(flat("runtime"), sets.refused)}`];
  return { eval: "coverage", operation: undefined, failures: [], notes };
};
