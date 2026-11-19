// A trace as the portal reads it: structure, outcome, caller kind, moves and events, never a value. The caller's kind is derived:
// a span with `principal.person` is a person (the span carries the person, not a kind), `principal.kind` "agent" an agent, and
// anyone else anyone. The person's id is read only to know there is one; it goes no further than this file.
import type { CallerKind, JourneyRun, LastCall, Outcome, WindowSpan, WindowTrace } from "../types.ts";

const text = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

/** The spans of an operation's attempts: they carry `operation` and a numeric `attempt`. */
export const attemptsOf = (trace: WindowTrace): ReadonlyArray<WindowSpan> =>
  trace.spans.filter((s) => text(s.attrs["operation"]) !== undefined && typeof s.attrs["attempt"] === "number").toSorted((a, b) => Number(a.attrs["attempt"]) - Number(b.attrs["attempt"]));

export const callerOf = (spans: ReadonlyArray<WindowSpan>): CallerKind => {
  if (spans.some((s) => s.attrs["principal.person"] !== undefined)) return "person";
  return spans.some((s) => s.attrs["principal.kind"] === "agent") ? "agent" : "anyone";
};

export const outcomeOf = (last: WindowSpan): Outcome => (text(last.attrs["refusal"]) !== undefined ? "refused" : last.status === 2 ? "defect" : "answered");

/** One row per trace: the last attempt decides the outcome, and the attempts are counted. `undefined` when there is no operation span. */
export const lastCallOf = (trace: string, found: WindowTrace): LastCall | undefined => {
  const attempts = attemptsOf(found);
  const last = attempts.at(-1);
  const operation = last === undefined ? undefined : text(last.attrs["operation"]);
  if (last === undefined || operation === undefined) return undefined;
  return { trace, operation, outcome: outcomeOf(last), callerKind: callerOf(found.spans), attempts: new Set(attempts.map((s) => s.attrs["attempt"])).size, start: last.start };
};

/** `<operation>:<move>` of each answered move in the trace, once per trace. */
export const movesOf = (found: WindowTrace): ReadonlyArray<{ readonly operation: string; readonly move: string }> => {
  const seen = new Map<string, { operation: string; move: string }>();
  for (const s of found.spans) {
    const operation = text(s.attrs["operation"]);
    const move = text(s.attrs["move.name"]);
    if (operation !== undefined && move !== undefined) seen.set(`${operation}:${move}`, { operation, move });
  }
  return [...seen.values()];
};

/** The events named by commit spans that committed. */
export const eventsOf = (found: WindowTrace): ReadonlyArray<string> =>
  found.spans.flatMap((s) => (s.attrs["commit.outcome"] === "committed" && text(s.attrs["event.name"]) !== undefined ? [String(s.attrs["event.name"])] : []));

/** A journey's steps in a trace, from the spans `journey-root.ts` writes: `journey` names the run, `journey.step` titles a step. */
export const journeyOf = (trace: string, found: WindowTrace): JourneyRun | undefined => {
  const steps = found.spans.filter((s) => text(s.attrs["journey"]) !== undefined && text(s.attrs["journey.step"]) !== undefined && text(s.attrs["operation"]) !== undefined).toSorted((a, b) => a.start - b.start);
  const first = steps[0];
  const call = lastCallOf(trace, found);
  const journey = first === undefined ? undefined : text(first.attrs["journey"]);
  if (first === undefined || journey === undefined || call === undefined) return undefined;
  return {
    journey,
    trace,
    caller: call.callerKind,
    steps: steps.map((s) => ({ title: String(s.attrs["journey.step"]), operation: String(s.attrs["operation"]), outcome: call.outcome })),
  };
};
