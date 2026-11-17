import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Evals } from "#modules/evals/service.js";
import type { CallRecord } from "#modules/journeys/types.js";
import type { Span, Trace, TraceSource } from "#modules/telemetry/types.js";
import { TraceTrees } from "./service.ts";

const span = (id: string, parent: string, name: string, start: number, attrs: Record<string, unknown> = {}, status = 1): Span =>
  ({ traceId: "t".repeat(32), spanId: id, parentSpanId: parent, name, attrs, status, ms: 2, start });
const log = (spanId: string, body: string) => ({ traceId: "t".repeat(32), spanId, body, attrs: {} });

const refusing: Trace = {
  spans: [
    span("a", "", "journey.grant", 0),
    span("b", "a", "POST", 1),
    span("c", "b", "allowance.grant", 2, { refusal: "AllowanceLimitTooHigh", "refusal.log": "over the cap" }),
    span("d", "c", "allowance.grant.insert", 3, { "step.kind": "database" }),
  ],
  logs: [log("c", "the limit is over the cap")],
};
const dying: Trace = {
  spans: [span("a", "", "journey.grant", 0), span("b", "a", "POST", 1), span("c", "b", "allowance.grant", 2, { defect: "Error: the ledger is on fire" }, 2)],
  logs: [],
};

describe("trace trees", () => {
  it("prints spans as a tree in start order, with each log under its span", () => {
    const lines = TraceTrees.render("t".repeat(32), refusing);
    expect(lines[0]).toBe(`trace ${"t".repeat(32)}  4 spans`);
    // Indentation is two spaces a level; the double spaces inside a line separate its parts.
    expect(lines.slice(1)).toEqual([
      "journey.grant  2.0 ms",
      "  POST  2.0 ms",
      "    allowance.grant  2.0 ms  refused AllowanceLimitTooHigh",
      "      · the limit is over the cap",
      "      allowance.grant.insert  2.0 ms  step database",
    ]);
  });

  it("marks a refusal and a defect differently: a refusal is an outcome, a defect is the error", () => {
    const refusal = TraceTrees.render("x", refusing).join("\n");
    const defect = TraceTrees.render("x", dying).join("\n");
    expect(refusal).toContain("refused AllowanceLimitTooHigh");
    expect(refusal).not.toContain("✘");
    expect(defect).toContain("✘ defect: Error: the ledger is on fire");
    expect(defect).not.toContain("refused");
  });

  it("treats a span whose parent is missing as a root, so a headless trace still prints", () => {
    const lines = TraceTrees.render("x", { spans: [span("b", "gone", "POST", 1)], logs: [] });
    expect(lines[1]).toContain("POST");
  });
});

describe("a TraceSource that is not a file", () => {
  it("drives the evals' evidence just the same", async () => {
    const source: TraceSource = {
      traces: (wanted) => Effect.succeed(new Map(wanted.map((w) => [w.trace, refusing]))),
      find: () => Effect.succeed(refusing),
    };
    const call = { journey: "grant", step: "ada grants", actor: "ada", person: "per_ada", operation: "allowance.grant", payload: {}, status: 409, body: { _tag: "AllowanceLimitTooHigh" }, trace: "t".repeat(32), parent: "a", mayCall: true, journal: [] } as CallRecord;
    const traces = await Effect.runPromise(source.traces([{ trace: call.trace, parent: call.parent }]));
    const [evidence] = Evals.gather([call], traces);
    expect(evidence!.opSpan?.name).toBe("allowance.grant");
    expect(evidence!.refusal).toBe("AllowanceLimitTooHigh");
  });
});
