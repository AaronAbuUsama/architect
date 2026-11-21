// Which step a defect died in, from the spans of its trace: the deepest span under the call's failing attempt that ended as an error, and the tag the
// runtime wrote on the attempt (`error.tag`, M1.49). Pure. A defect no step explains (a commit that lost every retry ends no span as an error) opens no issue.
import type { TelemetryCall, WindowSpan, WindowTrace } from "#modules/telemetry/types.js";

export interface Failure { readonly step: string; readonly tag: string }

const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

/** The attempt span that ended the call as an error: the last of the operation's own spans that started within the call's extent. */
const failingAttempt = (call: TelemetryCall, spans: ReadonlyArray<WindowSpan>): WindowSpan | undefined =>
  spans
    .filter((s) => s.name === call.operation && s.attrs["operation"] === call.operation && s.status === 2 && s.start >= call.start && s.start <= call.start + call.durationMs)
    .sort((a, b) => b.start - a.start)[0];

/** The error spans under `root`, each with its depth below it. */
const below = (root: WindowSpan, spans: ReadonlyArray<WindowSpan>): ReadonlyArray<{ readonly span: WindowSpan; readonly depth: number }> => {
  const found: Array<{ span: WindowSpan; depth: number }> = [];
  const walk = (parent: WindowSpan, depth: number, seen: ReadonlySet<string>) => {
    for (const child of spans.filter((s) => s.parentSpanId === parent.spanId && !seen.has(s.spanId))) {
      if (child.status === 2) found.push({ span: child, depth });
      walk(child, depth + 1, new Set([...seen, child.spanId]));
    }
  };
  walk(root, 1, new Set([root.spanId]));
  return found;
};

export const failureOf = (call: TelemetryCall, trace: WindowTrace | undefined): Failure | undefined => {
  if (trace === undefined) return undefined;
  const attempt = failingAttempt(call, trace.spans);
  if (attempt === undefined) return undefined;
  const deepest = [...below(attempt, trace.spans)].sort((a, b) => b.depth - a.depth || b.span.start - a.span.start)[0];
  if (deepest === undefined) return undefined;
  const name = deepest.span.name;
  return { step: name.startsWith(`${call.operation}.`) ? name.slice(call.operation.length + 1) : name, tag: text(attempt.attrs["error.tag"]) ?? "Error" };
};
