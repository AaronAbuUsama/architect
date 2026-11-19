// One call's spans, laid on the spine. Rows come from span attributes (attempt, step.kind, commit.outcome, move.name),
// never from span names. handle.claim's example is the one worth seeing: a commit conflict, then a retry that commits.
import { spineOf } from "./pages/op.tsx";
import type { Operation } from "./model.ts";

export type Row = { key: string; name: string; attr: string; start: number; ms: number; depth: number; tone?: "conflict" | "bad" };
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

export const traceOf = (o: Operation): Trace => {
  if (o.name === "handle.claim") {
    const a1 = attempt(o, 1, 0, "conflict"), s2 = a1.at(-1)!.start + a1.at(-1)!.ms + 0.4, a2 = attempt(o, 2, s2, "committed");
    const total = a2.at(-1)!.start + a2.at(-1)!.ms;
    return { id: "7f3a…", who: "aaron", at: "12:04:31", outcome: "answered", summary: "attempt 1 lost a version race at commit; attempt 2 committed", callerKind: "a person (signed-in)",
      attempts: 2, logs: 3, total, rows: [
        { key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: a1.at(-1)!.start + a1.at(-1)!.ms, depth: 0 }, ...a1,
        { key: "a2", name: "attempt 2", attr: "attempt: 2", start: s2, ms: total - s2, depth: 0 }, ...a2] };
  }
  const defect = o.name === "link.add", a = attempt(o, 1, 0, defect ? "defect" : "committed"), total = a.at(-1)!.start + a.at(-1)!.ms;
  return { id: defect ? "c41e…" : "2b9d…", who: defect ? "aaron" : o.allowed[0]?.kind === "anyone" ? "anyone" : "aaron", at: defect ? "12:04:20" : "12:03:12",
    outcome: defect ? "defect" : "answered", summary: defect ? "the record step failed with an undeclared error: a defect, always a bug" : "one attempt, committed",
    callerKind: o.allowed[0]?.kind === "anyone" ? "anyone" : "a person (signed-in)", attempts: 1, logs: defect ? 2 : 1, total,
    rows: [{ key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: total, depth: 0, tone: defect ? "bad" : undefined }, ...a] };
};
