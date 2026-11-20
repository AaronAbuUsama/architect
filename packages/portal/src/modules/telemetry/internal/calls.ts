// The calls of a window, from its spans. Pure. A call is one operation's attempt spans in one trace: a retry is one call. A journey's own
// span, a step span and a commit span are not attempts. Nothing is read from a span but a whitelist of structural attributes.
import type { CallerKind, CallsView, Outcome, TelemetryCall, WindowSpan, WindowTrace } from "../types.ts";
import { ROWS_MAX } from "../types.ts";
import { isAttempt, spanKind, type OperationKinds } from "./spans.ts";

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** The caller's kind, never the person: `principal.person` is a person; `principal.kind` says the rest. */
export const callerOf = (span: WindowSpan): CallerKind | undefined => {
  if (typeof span.attrs["principal.person"] === "string") return "person";
  const kind = text(span.attrs["principal.kind"]);
  return kind === "agent" ? "agent" : kind === "anonymous" ? "anyone" : kind === "person" ? "person" : undefined;
};

const numberOf = (span: WindowSpan) => (typeof span.attrs["attempt"] === "number" ? span.attrs["attempt"] : 1);

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The last attempt decides. A conflict is no refusal and ends its span ok, so a call whose final attempt's commit conflicted (the retries ran out:
 * the loop dies outside the attempt span, and `ortho.calls` counts a defect) committed nothing and is a defect, never an answer.
 */
const outcomeOf = (last: WindowSpan, spans: ReadonlyArray<WindowSpan>): { readonly outcome: Outcome; readonly refusal: string | null } => {
  const refusal = text(last.attrs["refusal"]);
  if (refusal !== undefined) return { outcome: "refused", refusal };
  const conflicted = spans.some((s) => s.parentSpanId === last.spanId && s.attrs["step.kind"] === "commit" && s.attrs["commit.outcome"] === "conflict");
  return { outcome: last.status === 2 || conflicted ? "defect" : "answered", refusal: null };
};

const callOf = (trace: string, operation: string, attempts: ReadonlyArray<WindowSpan>, all: ReadonlyArray<WindowSpan>, journey: string | null, environment: string, budget: number | undefined): TelemetryCall => {
  const ordered = [...attempts].sort((a, b) => numberOf(a) - numberOf(b) || a.start - b.start);
  const first = ordered.reduce((a, b) => (b.start < a.start ? b : a));
  const end = Math.max(...ordered.map((s) => s.start + s.ms));
  const durationMs = round(end - first.start);
  return {
    trace, operation, start: first.start, ...outcomeOf(ordered[ordered.length - 1]!, all),
    caller: ordered.map(callerOf).find((k) => k !== undefined) ?? "unknown",
    attempts: new Set(ordered.map(numberOf)).size,
    durationMs,
    environment: ordered.map((s) => text(s.attrs["environment"])).find((e) => e !== undefined) ?? environment,
    overBudget: budget !== undefined && durationMs > budget,
    journey, requestKey: null, roleHeld: null,
  };
};

/** Which of the call's attempts committed a move: an answered call whose attempt span carries `move.name`. */
const moved = (attempts: ReadonlyArray<WindowSpan>) => attempts.some((s) => typeof s.attrs["move.name"] === "string");

/** Calls with a span that were refused, per operation and refusal name, with the newest such trace. */
export type SpanRefusals = ReadonlyMap<string, { readonly operation: string; readonly name: string; readonly count: number; readonly trace: string; readonly start: number }>;

export const callsOf = (traces: ReadonlyMap<string, WindowTrace>, environment: string, budgets: Readonly<Record<string, number | undefined>>, kinds: OperationKinds): { readonly view: CallsView; readonly refusals: SpanRefusals } => {
  const all: Array<TelemetryCall> = [];
  const moves: Record<string, number> = {};
  const journeys: Record<string, Set<string>> = {};
  for (const [trace, { spans }] of traces) {
    const journey = spans.map((s) => text(s.attrs["journey"])).find((j) => j !== undefined) ?? null;
    const byOperation = new Map<string, Array<WindowSpan>>();
    for (const span of spans.filter((span) => isAttempt(spanKind(span, kinds)))) byOperation.set(String(span.attrs["operation"]), [...(byOperation.get(String(span.attrs["operation"])) ?? []), span]);
    for (const [operation, attempts] of byOperation) {
      const call = callOf(trace, operation, attempts, spans, journey, environment, budgets[operation]);
      all.push(call);
      if (call.outcome === "answered" && moved(attempts)) moves[operation] = (moves[operation] ?? 0) + 1;
      if (journey !== null) (journeys[operation] ??= new Set()).add(journey);
    }
  }
  // Newest first; a tie falls to the trace and the operation, so two reads of the same window are the same bytes.
  all.sort((a, b) => b.start - a.start || (a.trace < b.trace ? -1 : a.trace > b.trace ? 1 : a.operation < b.operation ? -1 : 1));
  const refusals = new Map<string, { operation: string; name: string; count: number; trace: string; start: number }>();
  for (const call of all) {
    if (call.refusal === null) continue;
    const key = `${call.operation}\u0000${call.refusal}`;
    const held = refusals.get(key);
    refusals.set(key, { operation: call.operation, name: call.refusal, count: (held?.count ?? 0) + 1, ...(held !== undefined && held.start >= call.start ? { trace: held.trace, start: held.start } : { trace: call.trace, start: call.start }) });
  }
  return {
    view: {
      rows: all.slice(0, ROWS_MAX), truncated: Math.max(0, all.length - ROWS_MAX), moves,
      journeys: Object.fromEntries(Object.entries(journeys).map(([op, set]) => [op, [...set].sort()])),
    },
    refusals,
  };
};
