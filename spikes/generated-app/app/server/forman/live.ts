// The named slices a live block asks for, never raw spans. Pure: traces and the model in, plain data out.
// A call is one trace: its operation span, or the HTTP span when the role check refused it before the span opened
// (NotAllowed names nobody: design gap 2). The same rules as the design's tools/extract.py.
import type { Trace } from "./traces.ts";
import type { Model } from "./types.ts";

export interface Call {
  readonly trace: string;
  readonly op: string;
  readonly at: number;
  readonly ms: number;
  readonly outcome: "answered" | "refused" | "defect";
  readonly refusal?: string;
  readonly log?: string;
  readonly person?: string;
  readonly replayed: boolean;
  readonly http?: string;
  readonly payload: Record<string, unknown>;
  readonly answer: Record<string, unknown>;
  readonly move?: string;
  readonly to?: string;
  readonly event?: string;
  readonly seenOn: "operation span" | "http span (no operation span opened)";
}

const sub = (a: Record<string, unknown>, prefix: string) =>
  Object.fromEntries(Object.entries(a).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

export const callOf = (model: Model, t: Trace): Call | undefined => {
  const op = t.spans.find((s) => s.name in model.operations);
  const http = t.spans.find((s) => s.name === "POST" || s.attrs["http.request.method"] === "POST");
  const status = http ? String(http.attrs["http.response.status_code"] ?? "") : undefined;
  if (op) {
    const a = op.attrs;
    return {
      trace: t.id, op: op.name, at: op.start, ms: op.ms,
      outcome: op.status === 2 ? "defect" : "refusal" in a ? "refused" : "answered",
      refusal: a["refusal"] as string | undefined, log: a["refusal.log"] as string | undefined, person: a["principal.person"] as string | undefined,
      replayed: a["request.replayed"] === true || a["request.replayed"] === "true", http: status,
      payload: sub(a, "payload."), answer: sub(a, "answer."),
      move: a["move.name"] as string | undefined, to: a["move.to"] as string | undefined, event: a["event.name"] as string | undefined,
      seenOn: "operation span",
    };
  }
  if (http && status === "403") {
    const route = String(http.attrs["http.route"] ?? http.attrs["url.path"] ?? "");
    return {
      trace: t.id, op: route.replace(/^\//, "").replace("/", "."), at: http.start, ms: http.ms, outcome: "refused", refusal: "NotAllowed",
      replayed: false, http: status, payload: {}, answer: {}, seenOn: "http span (no operation span opened)",
    };
  }
  return undefined;
};

export const callsOf = (model: Model, traces: ReadonlyArray<Trace>): Call[] =>
  traces.map((t) => callOf(model, t)).filter((c): c is Call => c !== undefined);

const pct = (xs: number[], p: number) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))]!;
};

/** One operation's numbers over a window. NotAllowed is left out of the timings: no handler ran. */
export const stats = (model: Model, op: string, calls: ReadonlyArray<Call>) => {
  const cs = calls.filter((c) => c.op === op);
  const timed = cs.filter((c) => c.refusal !== "NotAllowed").map((c) => c.ms);
  const refused: Record<string, number> = {};
  for (const c of cs) if (c.outcome === "refused") refused[c.refusal!] = (refused[c.refusal!] ?? 0) + 1;
  return {
    op, calls: cs.length, answered: cs.filter((c) => c.outcome === "answered").length, refused, defects: cs.filter((c) => c.outcome === "defect").length,
    p50: pct(timed, 0.5), p95: pct(timed, 0.95), budget: model.operations[op]?.budget?.p95Ms,
  };
};

/** Calls per minute, by outcome, for the last `minutes`. */
export const series = (calls: ReadonlyArray<Call>, op: string | undefined, now: number, minutes = 30) => {
  const rows = Array.from({ length: minutes }, (_, i) => ({ at: now - (minutes - i) * 60_000, answered: 0, refused: 0, defect: 0 }));
  for (const c of calls) {
    if (op && c.op !== op) continue;
    const i = Math.floor((c.at - (now - minutes * 60_000)) / 60_000);
    if (i >= 0 && i < minutes) rows[i]![c.outcome === "defect" ? "defect" : c.outcome]++;
  }
  return rows;
};

/** A move is counted from its event: allowance.revoke's span carries event.name but no move.name (design gap 3). */
export const moves = (model: Model, thing: string, calls: ReadonlyArray<Call>) => {
  const t = model.things[thing];
  const byEvent = new Map(Object.entries(t?.machine?.moves ?? {}).map(([k, m]) => [m.emits, k]));
  const out: Record<string, number> = {};
  for (const c of calls) {
    if (!c.event || model.operations[c.op]?.thing !== thing) continue;
    const key = `${byEvent.get(c.event) ?? c.op}→${c.to ?? (t?.machine?.moves[byEvent.get(c.event) ?? ""]?.to.join("|") ?? "?")}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return { moves: out, withoutMoveName: [...new Set(calls.filter((c) => c.event && !c.move).map((c) => c.op))] };
};

/** The span tree of one trace, in start order with depth, for a waterfall. */
export const waterfall = (t: Trace) => {
  const kids = new Map<string, typeof t.spans>();
  const ids = new Set(t.spans.map((s) => s.spanId));
  for (const s of t.spans) {
    const p = ids.has(s.parentSpanId) ? s.parentSpanId : "";
    kids.set(p, [...(kids.get(p) ?? []), s]);
  }
  const t0 = Math.min(...t.spans.map((s) => s.start));
  const t1 = Math.max(...t.spans.map((s) => s.start + s.ms));
  const rows: Array<{ name: string; depth: number; at: number; ms: number; status: number; attrs: Record<string, unknown>; spanId: string }> = [];
  const walk = (parent: string, depth: number) => {
    for (const s of [...(kids.get(parent) ?? [])].sort((a, b) => a.start - b.start)) {
      rows.push({ name: s.name, depth, at: s.start - t0, ms: s.ms, status: s.status, attrs: { ...s.attrs }, spanId: s.spanId });
      walk(s.spanId, depth + 1);
    }
  };
  walk("", 0);
  return { trace: t.id, total: t1 - t0, rows, logs: t.logs.map((l) => ({ body: l.body, attrs: l.attrs })) };
};
