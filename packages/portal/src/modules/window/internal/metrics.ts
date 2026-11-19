// `ortho.calls` in the window, folded: calls per operation by outcome, and refusals by their declared name. A call refused at the door
// opens no span, so only these points count it (portal.md, "An operation's page").
import type { CallStat, MetricPoint } from "../types.ts";

const empty: CallStat = { calls: 0, answered: 0, refused: 0, defects: 0 };

export const callsOf = (points: ReadonlyArray<MetricPoint>): { readonly byOperation: Record<string, CallStat>; readonly refusals: Record<string, number> } => {
  const byOperation: Record<string, CallStat> = {};
  const refusals: Record<string, number> = {};
  for (const point of points) {
    const operation = point.labels["operation"];
    if (point.name !== "ortho.calls" || operation === undefined) continue;
    const before = byOperation[operation] ?? empty;
    const outcome = point.labels["outcome"];
    byOperation[operation] = {
      calls: before.calls + point.value,
      answered: before.answered + (outcome === "answered" ? point.value : 0),
      refused: before.refused + (outcome === "refused" ? point.value : 0),
      defects: before.defects + (outcome === "defect" ? point.value : 0),
    };
    const refusal = point.labels["refusal"];
    if (outcome === "refused" && refusal !== undefined) refusals[refusal] = (refusals[refusal] ?? 0) + point.value;
  }
  return { byOperation, refusals };
};

export const none: CallStat = empty;

/** The sum of several operations' stats: a thing's, or everything's. */
export const total = (stats: ReadonlyArray<CallStat>): CallStat =>
  stats.reduce((sum, s) => ({ calls: sum.calls + s.calls, answered: sum.answered + s.answered, refused: sum.refused + s.refused, defects: sum.defects + s.defects }), empty);
