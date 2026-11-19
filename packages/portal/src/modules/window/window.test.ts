import { Effect } from "effect";
import { expect, it } from "vitest";
import { Window } from "./service.ts";
import type { LiveContext, WindowSpan, WindowTrace } from "./types.ts";

const span = (name: string, start: number, attrs: Record<string, unknown>, status = 1): WindowSpan => ({ traceId: "t", spanId: name + start, parentSpanId: "", name, attrs, status, ms: 5, start });
const traces = new Map<string, WindowTrace>([
  ["a", { spans: [span("c", 1, { operation: "handle.claim", attempt: 1, "principal.person": "per_x" }), span("c", 2, { operation: "handle.claim", attempt: 2, "principal.person": "per_x", "move.name": "claim" })], logs: [] }],
  ["b", { spans: [span("c", 3, { operation: "handle.claim", attempt: 1, refusal: "HandleTaken", "principal.kind": "agent" })], logs: [] }],
]);
const live = (now: number | undefined): LiveContext => ({
  environment: "local", now: now ?? 0, windowMs: 100,
  source: { find: () => Effect.succeed(undefined), window: () => Effect.succeed(traces) },
  metrics: { window: () => Effect.succeed([
    { name: "ortho.calls", labels: { operation: "handle.claim", outcome: "answered" }, value: 1 },
    { name: "ortho.calls", labels: { operation: "handle.claim", outcome: "refused", refusal: "HandleTaken" }, value: 4 },
    { name: "other.metric", labels: { operation: "handle.claim", outcome: "answered" }, value: 99 },
  ]) },
});

it("counts calls from the metrics (door refusals included), one row per trace, and derives the caller's kind", async () => {
  const view = await Effect.runPromise(Window.read(live(1000), () => "handle"));
  expect(view.byOperation["handle.claim"]).toEqual({ calls: 5, answered: 1, refused: 4, defects: 0 });
  expect(view.refusals).toEqual({ HandleTaken: 4 });
  expect(view.lastCalls.map((c) => [c.trace, c.outcome, c.callerKind, c.attempts])).toEqual([["b", "refused", "agent", 1], ["a", "answered", "person", 2]]);
  expect(view.moves).toEqual({ "handle.claim": 1 });
  expect(JSON.stringify(view)).not.toContain("per_x");
});
