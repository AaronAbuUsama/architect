// One trace as a waterfall: a span tree with offsets from the first span, each span given a role from the model.
import type { Model, Trace } from "./model.ts";
import type { SpanRow, TraceView } from "./types.ts";

const roleOf = (model: Model, name: string, attrs: Readonly<Record<string, unknown>>): SpanRow["role"] => {
  if (name.startsWith("journey.")) return "caller";
  if (model.operations[name]) return "operation";
  if (Object.values(model.operations).some((o) => Object.values(o.steps).some((s) => s.name === name) || `${o.name}.commit` === name)) return "step";
  if (attrs["db.system.name"] !== undefined || name === "BATCH") return "store";
  if (attrs["http.request.method"] !== undefined || attrs["http.route"] !== undefined) return "http";
  return "other";
};

export const traceView = (model: Model, id: string, trace: Trace): TraceView => {
  const first = Math.min(...trace.spans.map((s) => s.start));
  const last = Math.max(...trace.spans.map((s) => s.start + s.ms));
  const ids = new Set(trace.spans.map((s) => s.spanId));
  const build = (parent: string, depth: number): ReadonlyArray<SpanRow> =>
    trace.spans
      .filter((s) => (parent === "" ? !ids.has(s.parentSpanId) : s.parentSpanId === parent))
      .sort((a, b) => a.start - b.start || (model.operations[b.name] ? 1 : 0) - (model.operations[a.name] ? 1 : 0))
      .map((s) => ({
        id: s.spanId,
        parent: s.parentSpanId,
        name: s.name,
        depth,
        offset: s.start - first,
        ms: s.ms,
        role: roleOf(model, s.name, s.attrs),
        status: s.status === 2 || s.attrs["defect"] !== undefined ? "error" : s.attrs["refusal"] !== undefined ? "refusal" : "ok",
        attrs: s.attrs,
        children: build(s.spanId, depth + 1),
      }));
  const nameOf = new Map(trace.spans.map((s) => [s.spanId, s.name]));
  return {
    trace: id,
    total: Math.max(1, last - first),
    roots: build("", 0),
    logs: trace.logs.map((l) => ({ span: l.spanId, spanName: nameOf.get(l.spanId) ?? "?", body: l.body, attrs: l.attrs })),
  };
};
