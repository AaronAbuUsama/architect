// Calls as telemetry shows them: a trace with an operation's span is one call, and the evals read it as they read prove's.
import type { Model } from "@architect/compiler";
import type { CallRecord } from "#modules/journeys/types.js";
import type { Evidence } from "#modules/evals/types.js";
import { PROVE_SPAN_PREFIX, type Span, type Trace } from "#modules/telemetry/types.js";

/** A trace prove made: a span of it points at a caller span prove made up. Prove judged it already. */
const madeByProve = (trace: Trace): boolean => trace.spans.some((s) => s.parentSpanId.startsWith(PROVE_SPAN_PREFIX));

export interface Seen {
  readonly evidence: ReadonlyArray<Evidence>;
  /** Traces left out because a prove run made them. */
  readonly left: number;
}

/** What the operation's span says happened: refused (a declared outcome), died (a defect), or answered. */
const statusOf = (span: Span): number => (typeof span.attrs["refusal"] === "string" ? 422 : span.status === 2 ? 500 : 200);

export const evidenceOf = (model: Model, traces: ReadonlyMap<string, Trace>): Seen => {
  let left = 0;
  const evidence: Array<Evidence> = [];
  for (const [id, trace] of traces) {
    if (madeByProve(trace)) {
      left += 1;
      continue;
    }
    const opSpan = trace.spans.filter((s) => model.operations[s.name] !== undefined).sort((a, b) => a.start - b.start)[0];
    if (!opSpan) continue;
    const refusal = typeof opSpan.attrs["refusal"] === "string" ? opSpan.attrs["refusal"] : undefined;
    // Live there is no caller to ask: no actor, no payload, no answer body. The evals read the spans.
    const call: CallRecord = {
      journey: "watch", step: id, actor: "live", person: "live", operation: opSpan.name, payload: {}, status: statusOf(opSpan),
      body: undefined, trace: id, parent: "", mayCall: true, journal: [],
    };
    evidence.push({ call, trace, opSpan, refusal, stored: undefined });
  }
  return { evidence, left };
};
