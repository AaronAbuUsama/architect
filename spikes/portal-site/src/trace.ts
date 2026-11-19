// One call's spans, laid on the spine. Rows come from span attributes (attempt, step.kind, commit.outcome, move.name),
// never from span names. Each row of the calls table (calls.ts) opens one: answered, refused where the spine stopped it,
// a defect, or a commit conflict and the retry that committed.
import { spineOf } from "./pages/op.tsx";
import type { CallRow } from "./calls.ts";
import { model, type Operation } from "./model.ts";

export type Row = { key: string; name: string; attr: string; start: number; ms: number; depth: number; tone?: "conflict" | "bad" | "refused" };
export type Trace = { id: string; who: string; at: string; outcome: string; summary: string; callerKind: string; attempts: number; logs: number; total: number; rows: Row[] };

const timing: Record<string, number> = { "role check": 0.1, replay: 0.2, "machine check": 0.1, "answer check": 0.1, commit: 1.2 };

const attempt = (o: Operation, n: number, start: number, end: "committed" | "conflict" | "defect"): Row[] => {
  let t = start;
  const rows: Row[] = [];
  for (const r of spineOf(o)) {
    if (r.row === "replay" && n > 1) continue;
    const isStep = r.row.startsWith("step"), last = r.row === "commit";
    const ms = isStep ? (r.row.endsWith("load") ? 2.0 : 1.1) : last ? (end === "committed" ? 3.2 : 1.0) : r.row.startsWith("move") ? 0.1 : timing[r.row] ?? 0.1;
    const failHere = end === "defect" && isStep && r.row.endsWith("record");
    rows.push({ key: `${n}-${r.row}`, name: r.row, depth: 1, start: t, ms,
      attr: failHere ? "defect · DatabaseError" : last ? `commit.outcome: ${end === "conflict" ? "conflict" : end === "committed" ? "committed" : "—"}` : isStep ? `step.kind: ${r.what}` : r.row.startsWith("move") ? `move.name: ${r.row.slice(5)}` : typeof r.what === "string" ? r.what : "machine.check: passed",
      tone: failHere ? "bad" : last && end === "conflict" ? "conflict" : undefined });
    t += ms;
    if (failHere) break;
  }
  return rows;
};

/** Where a refusal stops the spine: the role check, the machine check, or the first step (a declared refusal). */
const refusedAt = (o: Operation, code: string) => code === "NotAllowed" ? "role check"
  : model.things[o.thing]?.machine?.notFrom.error === code ? "machine check" : (spineOf(o).find((r) => r.row.startsWith("step"))?.row ?? "answer check");

/** One row of the calls table, as its trace: the same spine, cut where the call ended. */
export const traceOfCall = (o: Operation, c: CallRow): Trace => {
  const callerKind = { anyone: "anyone", "signed-in": "a person (signed-in)", role: "a person holding a role", agent: "an agent" }[c.caller];
  const base = { id: c.id, who: c.caller, at: c.at, callerKind, logs: c.outcome === "defect" ? 2 : 1, attempts: c.attempts };
  if (c.outcome === "refused") {
    const stop = refusedAt(o, c.code!), rows: Row[] = [];
    let t = 0;
    for (const r of spineOf(o)) {
      const last = r.row === stop, ms = r.row.startsWith("step") ? 1.1 : 0.1;
      rows.push({ key: `1-${r.row}`, name: r.row, depth: 1, start: t, ms, attr: last ? `refusal.code: ${model.refusals[c.code!]} ${c.code}` : typeof r.what === "string" ? r.what : "passed", tone: last ? "refused" : undefined });
      t += ms;
      if (last) break;
    }
    return { ...base, outcome: c.code!, summary: `refused ${c.code} at the ${stop}: a declared answer, not a failure`, total: t,
      rows: [{ key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: t, depth: 0 }, ...rows] };
  }
  if (c.outcome === "defect") {
    const a = attempt(o, 1, 0, "defect"), total = a.at(-1)!.start + a.at(-1)!.ms;
    return { ...base, outcome: "defect", summary: "a step failed with an undeclared error: a defect, always a bug", total,
      rows: [{ key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: total, depth: 0, tone: "bad" }, ...a] };
  }
  if (c.attempts > 1) {
    const a1 = attempt(o, 1, 0, "conflict"), s2 = a1.at(-1)!.start + a1.at(-1)!.ms + 0.4, a2 = attempt(o, 2, s2, "committed"), total = a2.at(-1)!.start + a2.at(-1)!.ms;
    return { ...base, outcome: "answered", summary: "attempt 1 lost a version race at commit; attempt 2 committed", total, rows: [
      { key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: a1.at(-1)!.start + a1.at(-1)!.ms, depth: 0 }, ...a1,
      { key: "a2", name: "attempt 2", attr: "attempt: 2", start: s2, ms: total - s2, depth: 0 }, ...a2] };
  }
  const a = attempt(o, 1, 0, "committed"), total = a.at(-1)!.start + a.at(-1)!.ms;
  return { ...base, outcome: "answered", summary: "one attempt, committed", total, rows: [{ key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: total, depth: 0 }, ...a] };
};
