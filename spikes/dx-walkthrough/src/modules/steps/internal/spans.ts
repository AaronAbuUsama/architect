// prove's traces, read from the OTLP JSON lines its Collector wrote, into one value per trace.
import { existsSync, readFileSync } from "node:fs";
import type { Span, Trace } from "../types.ts";

interface OtlpValue { readonly stringValue?: string; readonly intValue?: number | string; readonly boolValue?: boolean; readonly doubleValue?: number }
interface OtlpSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTimeUnixNano: string;
  readonly endTimeUnixNano: string;
  readonly status?: { readonly code?: number };
  readonly attributes?: ReadonlyArray<{ readonly key: string; readonly value: OtlpValue }>;
  readonly events?: ReadonlyArray<{ readonly name: string; readonly timeUnixNano: string }>;
}

const valueOf = (v: OtlpValue): string | number | boolean =>
  v.stringValue ?? (v.intValue !== undefined ? Number(v.intValue) : undefined) ?? v.boolValue ?? v.doubleValue ?? "";

/** Nanoseconds as a string to milliseconds, keeping the tenth: BigInt so nothing is lost before the division. */
const ms = (nanos: string, from: bigint): number => Number((BigInt(nanos) - from) / 100_000n) / 10;

/** Attributes the runtime adds for Effect's own bookkeeping; they say nothing about the call. */
const internal = (key: string) => key.startsWith("effect.") || key.startsWith("code.");

export const readTraces = (file: string): ReadonlyArray<Trace> => {
  if (!existsSync(file)) return [];
  const spans: Array<OtlpSpan> = [];
  for (const line of readFileSync(file, "utf8").split("\n").filter(Boolean)) {
    const batch = JSON.parse(line) as { resourceSpans: ReadonlyArray<{ scopeSpans: ReadonlyArray<{ spans: ReadonlyArray<OtlpSpan> }> }> };
    for (const r of batch.resourceSpans) for (const s of r.scopeSpans) spans.push(...s.spans);
  }
  const byTrace = new Map<string, Array<OtlpSpan>>();
  for (const s of spans) byTrace.set(s.traceId, [...(byTrace.get(s.traceId) ?? []), s]);
  const first = spans.reduce((m, s) => (BigInt(s.startTimeUnixNano) < m ? BigInt(s.startTimeUnixNano) : m), BigInt(spans[0]?.startTimeUnixNano ?? "0"));

  const traces = [...byTrace.entries()].map(([id, list]): Trace => {
    const sorted = [...list].sort((a, b) => (BigInt(a.startTimeUnixNano) < BigInt(b.startTimeUnixNano) ? -1 : 1));
    const start = BigInt(sorted[0]!.startTimeUnixNano);
    const index = new Map(sorted.map((s, i) => [s.spanId, i]));
    const out: ReadonlyArray<Span> = sorted.map((s) => ({
      name: s.name,
      parent: s.parentSpanId !== undefined && index.has(s.parentSpanId) ? index.get(s.parentSpanId)! : -1,
      start: ms(s.startTimeUnixNano, start),
      duration: ms(s.endTimeUnixNano, BigInt(s.startTimeUnixNano)),
      status: s.status?.code ?? 0,
      attributes: Object.fromEntries((s.attributes ?? []).filter((a) => !internal(a.key)).map((a) => [a.key, valueOf(a.value)])),
      events: (s.events ?? []).map((e) => ({ name: e.name, at: ms(e.timeUnixNano, start) })),
    }));
    const root = out.find((s) => s.parent === -1) ?? out[0]!;
    const op = out.find((s) => typeof s.attributes["operation"] === "string" && s.name === s.attributes["operation"]);
    const refusal = op?.attributes["refusal"];
    return {
      id,
      at: ms(sorted[0]!.startTimeUnixNano, first),
      journey: String(root.attributes["journey"] ?? root.name),
      step: String(root.attributes["journey.step"] ?? ""),
      operation: String(op?.attributes["operation"] ?? root.attributes["operation"] ?? ""),
      ...(typeof refusal === "string" ? { refusal } : {}),
      spans: out,
    };
  });
  return traces.sort((a, b) => a.at - b.at);
};
