import type { Span, Trace } from "@prove/modules/telemetry/types.ts";
import type { Activity, BlueprintWire, Call, Outcome, TraceSpan } from "../types.ts";

type Operation = BlueprintWire["model"]["operations"][string];

const statusOf = (span: Span | undefined) => {
  const status = Number(span?.attrs["http.response.status_code"]);
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
};

const outcomeOf = (span: Span, http?: number): Outcome => {
  if (typeof span.attrs["defect"] === "string") return "defect";
  if (typeof span.attrs["refusal"] === "string") return "refused";
  if ((http ?? 0) >= 400 && (http ?? 0) < 500) return "refused";
  if (span.status === 2 || (http ?? 0) >= 500) return "defect";
  if (span.status === 1 || (http ?? 0) >= 200) return "answered";
  return "unknown";
};

const labelOf = (span: Span, names: ReadonlySet<string>) => {
  if (names.has(span.name)) return span.name;
  if (span.attrs["db.system.name"] !== undefined || span.attrs["db.statement"] !== undefined ||
    span.attrs["db.query.text"] !== undefined || /^(select|update|insert|delete|replace|pragma|batch|sqlite)\b/iu.test(span.name)) {
    return "Database";
  }
  if (span.attrs["http.request.method"] !== undefined || span.attrs["http.route"] !== undefined || statusOf(span) !== undefined) return "HTTP request";
  if (span.name.startsWith("journey.")) return "Journey";
  return "Nested span";
};

const requestOf = (span: Span, byId: ReadonlyMap<string, Span>, route: string): Span | undefined => {
  const seen = new Set<string>();
  let parent = byId.get(span.parentSpanId);
  while (parent && !seen.has(parent.spanId)) {
    if (parent.attrs["http.route"] === route || parent.attrs["url.path"] === route) return parent;
    seen.add(parent.spanId);
    parent = byId.get(parent.parentSpanId);
  }
  return undefined;
};

const callsOf = (operation: Operation, traceId: string, trace: Trace, names: ReadonlySet<string>, stepKinds: ReadonlyMap<string, string>): Call[] => {
  const route = `/${operation.thing}/${operation.verb}`;
  const byId = new Map(trace.spans.map((span) => [span.spanId, span]));
  const logs = Map.groupBy(trace.logs, (log) => log.spanId);
  const clean: TraceSpan[] = [...byId.values()].map((span) => {
    const http = statusOf(span);
    const refusal = span.attrs["refusal"];
    const stepKind = stepKinds.get(span.name);
    return {
      id: span.spanId, parent: span.parentSpanId, start: span.start, ms: span.ms, name: labelOf(span, names),
      outcome: outcomeOf(span, http),
      logCount: logs.get(span.spanId)?.length ?? 0,
      ...(http === undefined ? {} : { http }),
      ...(typeof refusal === "string" && operation.refusals.includes(refusal) ? { refusal } : {}),
      ...(stepKind && { stepKind }),
    };
  });
  const matched = [...byId.values()].filter((span) => span.name === operation.name);
  const covered = new Set<string>();
  const make = (span: Span, request: Span | undefined, reached: boolean, start = span.start): Call => {
    const http = statusOf(request);
    const tag = span.attrs["refusal"];
    const refusal = typeof tag === "string" && operation.refusals.includes(tag) ? tag
      : !reached && http === 403 ? "NotAllowed"
      : !reached && http === 400 ? "InvalidPayload"
      : undefined;
    const outcome = outcomeOf(span, http);
    return {
      traceId, id: span.spanId, start, ms: span.start - start + span.ms, http, refusal,
      outcome,
      replayed: span.attrs["request.replayed"] === true, reached, spans: clean,
    };
  };
  const attemptsByCall = Map.groupBy(matched.map((span) => ({ span, request: requestOf(span, byId, route) })),
    ({ span, request }) => request?.spanId ?? span.spanId);
  const entered = [...attemptsByCall.values()].map((attempts) => {
    attempts.sort((a, b) => a.span.start - b.span.start || a.span.ms - b.span.ms);
    const first = attempts[0]!;
    const last = attempts[attempts.length - 1]!;
    if (last.request) covered.add(last.request.spanId);
    return make(last.span, last.request, true, first.span.start);
  });
  const atDoor = [...byId.values()].filter((span) => !covered.has(span.spanId)
    && (span.attrs["http.route"] === route || span.attrs["url.path"] === route)
    && statusOf(span) !== undefined);
  return [...entered, ...atDoor.map((span) => make(span, span, false))];
};

export const projectActivity = (
  blueprint: BlueprintWire, traces: ReadonlyMap<string, Trace>, start: number, end: number,
): Activity => {
  const operations = Object.values(blueprint.model.operations);
  const names = new Set(operations.flatMap((op) => [op.name, ...Object.values(op.steps).map((step) => step.name)]));
  const stepKinds = new Map(operations.flatMap((op) => Object.values(op.steps).flatMap((step) => step.type ? [[step.name, step.type] as const] : [])));
  const calls = new Map(operations.map((op) => [op.name, [...traces].flatMap(([id, trace]) => callsOf(op, id, trace, names, stepKinds))
    .filter((call) => call.start >= start && call.start < end).sort((a, b) => b.start - a.start)]));
  return { start, end, calls };
};

export const p95 = (calls: readonly Call[]) => {
  const samples = calls.filter((call) => call.reached).map((call) => call.ms).sort((a, b) => a - b);
  return samples[Math.ceil(samples.length * 0.95) - 1];
};

export const ms = (duration: number) => `${Number(duration.toFixed(2))} ms`;
