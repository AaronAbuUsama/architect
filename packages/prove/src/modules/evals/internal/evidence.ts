// Building each call's evidence, and the small readings every eval shares.
import type { CallRecord } from "#modules/journeys/types.js";
import type { Span, Trace } from "#modules/telemetry/types.js";
import type { Evidence } from "../types.ts";

const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** `grant-an-allowance "ada grants olga 500"`: where a failure happened. */
export const where = (e: Evidence) => `${kebab(e.call.journey)} "${e.call.step}"`;

export const answered = (e: Evidence) => e.call.status === 200;

/** Every span under the operation's span, itself included. */
export const subtree = (trace: Trace, root: Span | undefined): ReadonlyArray<Span> => {
  if (!root) return [];
  const out: Array<Span> = [root];
  for (let i = 0; i < out.length; i++) out.push(...trace.spans.filter((s) => s.parentSpanId === out[i]!.spanId));
  return out;
};

/** A span attribute anywhere in the operation's subtree: `move.to` is written on whichever span made the move. */
export const attr = (e: Evidence, key: string): unknown => subtree(e.trace, e.opSpan).find((s) => key in s.attrs)?.attrs[key];

const refusalOf = (call: CallRecord, opSpan: Span | undefined): string | undefined => {
  const tag = call.status >= 400 && call.status < 500 && typeof call.body === "object" && call.body !== null ? (call.body as { _tag?: unknown })._tag : undefined;
  if (typeof tag === "string") return tag;
  const onSpan = opSpan?.attrs["refusal"];
  return typeof onSpan === "string" ? onSpan : undefined;
};

export const gather = (calls: ReadonlyArray<CallRecord>, traces: ReadonlyMap<string, Trace>): ReadonlyArray<Evidence> =>
  calls.map((call) => {
    const trace = traces.get(call.trace) ?? { spans: [], logs: [] };
    const opSpan = trace.spans.find((s) => s.name === call.operation);
    return { call, trace, opSpan, refusal: refusalOf(call, opSpan), stored: call.stored };
  });

/** A call the server answered from a request it already committed: it ran nothing, so it moved nothing. */
export const replayed = (e: Evidence) => attr(e, "request.replayed") === true;
