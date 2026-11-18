import type { Log, Span, Trace } from "#modules/telemetry/types.js";
import type { TraceTreesApi } from "./types.ts";

const ms = (n: number) => `${n < 10 ? n.toFixed(1) : Math.round(n)} ms`;

/** The conventions of O1, in words: a refusal is an outcome, a defect is the only error. */
const marks = (s: Span): ReadonlyArray<string> => {
  const defect = s.attrs["defect"];
  const refusal = s.attrs["refusal"];
  return [
    ...(typeof defect === "string" ? [`✘ defect: ${defect}`] : s.status === 2 ? ["✘ error"] : []),
    ...(typeof refusal === "string" ? [`refused ${refusal}`] : []),
  ];
};

/** What a person reads off a span without opening it: the step's kind and the move it made. */
const facts = (s: Span): ReadonlyArray<string> => [
  ...(typeof s.attrs["step.kind"] === "string" ? [`step ${String(s.attrs["step.kind"])}`] : []),
  ...(typeof s.attrs["move.name"] === "string" ? [`move ${String(s.attrs["move.name"])}${s.attrs["move.to"] === undefined ? "" : ` → ${String(s.attrs["move.to"])}`}`] : []),
];

const spanLine = (s: Span) => [`${s.name}  ${ms(s.ms)}`, ...marks(s), ...facts(s)].join("  ");

export const TraceTrees: TraceTreesApi = {
  render: (id: string, trace: Trace) => {
    const ids = new Set(trace.spans.map((s) => s.spanId));
    const children = (parent: string) => trace.spans.filter((s) => s.parentSpanId === parent).sort((a, b) => a.start - b.start);
    // A span whose parent isn't in the trace is a root of what was found: the journey's span, or the server's own when prove
    // had no way to export the caller's.
    const roots = trace.spans.filter((s) => s.parentSpanId === "" || !ids.has(s.parentSpanId)).sort((a, b) => a.start - b.start);
    const logsOf = (span: string): ReadonlyArray<Log> => trace.logs.filter((l) => l.spanId === span);
    const walk = (s: Span, depth: number): ReadonlyArray<string> => {
      const pad = "  ".repeat(depth);
      return [
        `${pad}${spanLine(s)}`,
        ...logsOf(s.spanId).map((l) => `${pad}  · ${l.body}`),
        ...children(s.spanId).flatMap((c) => walk(c, depth + 1)),
      ];
    };
    const detached = trace.logs.filter((l) => l.spanId === "" || !ids.has(l.spanId));
    return [
      `trace ${id}  ${trace.spans.length} span${trace.spans.length === 1 ? "" : "s"}`,
      ...roots.flatMap((r) => walk(r, 0)),
      ...detached.map((l) => `· ${l.body}`),
    ];
  },
};
