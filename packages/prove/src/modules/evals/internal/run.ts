// Eval 7 (performance, review only) and eval 8 (coverage, over the whole run).
import type { Model } from "@architect/compiler";
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

/**
 * 8. Every declared operation called, every move made, every outcome reached and every declared error refused, by some
 * journey or starting world. The runtime's own refusals (NotAllowed, the machine's) are counted but never required.
 */
export const coverage = (model: Model, evidence: ReadonlyArray<Evidence>): Verdict => {
  const ops = Object.values(model.operations);
  const called = new Set(evidence.map((e) => e.call.operation));
  const moves = ops.filter((o) => o.move).map((o) => `${o.thing}.${o.move!.key}`);
  const moved = new Set(evidence.filter((e) => answered(e) && attr(e, "move.to") !== undefined).map((e) => `${model.operations[e.call.operation]?.thing}.${model.operations[e.call.operation]?.move?.key}`));
  const outcomes = [...new Set(ops.flatMap((o) => (o.move ? o.move.to.map((s) => `${o.thing}:${s}`) : [])))];
  const reached = new Set(evidence.filter(answered).flatMap((e) => {
    const to = attr(e, "move.to");
    return to === undefined ? [] : [`${model.operations[e.call.operation]?.thing}:${String(to)}`];
  }));
  const errors = [...new Set(ops.flatMap((o) => o.errors.map((x) => `${o.name}:${x}`)))];
  const refused = new Set(evidence.flatMap((e) => (e.refusal ? [`${e.call.operation}:${e.refusal}`] : [])));
  const computed = [...new Set(ops.flatMap((o) => o.refusals.filter((r) => !o.errors.includes(r)).map((r) => `${o.name}:${r}`)))];
  const count = (all: ReadonlyArray<string>, hit: ReadonlySet<string>) => `${all.filter((x) => hit.has(x)).length}/${all.length}`;
  const failures = [
    ...ops.filter((o) => !called.has(o.name)).map((o) => `${o.name} reached by no journey`),
    ...moves.filter((m) => !moved.has(m)).map((m) => `move ${m} made by no journey`),
    ...outcomes.filter((s) => !reached.has(s)).map((s) => `outcome ${s.replace(":", " ")} reached by no journey`),
    ...errors.filter((x) => !refused.has(x)).map((x) => `${x.replace(":", " refusing ")} reached by no journey`),
  ];
  const summary = `operations ${count(ops.map((o) => o.name), called)} moves ${count(moves, moved)} outcomes ${count(outcomes, reached)} errors ${count(errors, refused)} (runtime refusals ${count(computed, refused)})`;
  return { eval: "coverage", operation: undefined, failures, notes: [summary] };
};
