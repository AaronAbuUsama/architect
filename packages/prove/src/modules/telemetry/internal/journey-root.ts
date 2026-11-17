// The journey's own span. A call's `traceparent` names a span prove made up, so every trace prove makes looks headless
// in any viewer ("root span not yet received"). Prove exports that span, named `journey.<name>`, so the viewer shows
// the journey as each trace's root (O1).
import { Effect } from "effect";
import type { Trace } from "../types.ts";

export interface JourneyRoot {
  readonly trace: string;
  /** The span id the call's `traceparent` carried: the id this span is exported under. */
  readonly span: string;
  readonly journey: string;
  readonly step: string;
  readonly operation: string;
  /** What the call answered with (HTTP status): a 5xx is a failed span, anything else is not. */
  readonly status: number;
}

const nanos = (ms: number): string => String(BigInt(Math.round(ms * 1000)) * 1000n);

/**
 * The span for one call, covering exactly the spans the server recorded for it (so it never starts after, or ends
 * before, what it contains, whatever the two clocks say). Nothing when the server recorded nothing.
 */
export const rootOf = (call: JourneyRoot, trace: Trace | undefined) => {
  const mine = (trace?.spans ?? []).filter((s) => s.spanId !== call.span);
  if (mine.length === 0) return undefined;
  const start = Math.min(...mine.map((s) => s.start));
  const end = Math.max(...mine.map((s) => s.start + s.ms));
  const text = (key: string, value: string) => ({ key, value: { stringValue: value } });
  return {
    traceId: call.trace, spanId: call.span, name: `journey.${call.journey}`, kind: 1,
    startTimeUnixNano: nanos(start), endTimeUnixNano: nanos(end),
    attributes: [text("journey", call.journey), text("journey.step", call.step), text("operation", call.operation), { key: "http.status_code", value: { intValue: String(call.status) } }],
    status: call.status >= 500 ? { code: 2, message: `the call answered ${call.status}` } : { code: 1 },
  };
};

/** Send the spans to the collector at `url`, once. A collector that doesn't take them leaves the evals unchanged. */
export const exportRoots = (url: string, spans: ReadonlyArray<NonNullable<ReturnType<typeof rootOf>>>) =>
  spans.length === 0
    ? Effect.void
    : Effect.promise(() =>
        fetch(`${url}/v1/traces`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resourceSpans: [{
              resource: { attributes: [{ key: "service.name", value: { stringValue: "forman-prove" } }, { key: "deployment.environment", value: { stringValue: "local" } }] },
              scopeSpans: [{ scope: { name: "forman.prove" }, spans }],
            }],
          }),
        }).then(() => undefined, () => undefined),
      );
