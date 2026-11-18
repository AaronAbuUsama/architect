// A `window` over the local viewer (grafana/otel-lgtm): Tempo for spans, Loki for logs, both through Grafana's
// datasource proxy (the container publishes only Grafana and OTLP). Same answer shape as prove's FileSource.
import type { Log, Span, Trace } from "../src/page/model.ts";

const hex = (b64: string) => Buffer.from(b64, "base64").toString("hex");
const value = (v: Record<string, unknown> | undefined): unknown => {
  if (!v) return undefined;
  if ("stringValue" in v) return v["stringValue"];
  if ("intValue" in v) return Number(v["intValue"]);
  if ("boolValue" in v) return v["boolValue"];
  if ("doubleValue" in v) return v["doubleValue"];
  return JSON.stringify(v);
};
const attrs = (kvs: ReadonlyArray<{ key: string; value: Record<string, unknown> }> = []) => Object.fromEntries(kvs.map((kv) => [kv.key, value(kv.value)]));
const STATUS: Record<string, number> = { STATUS_CODE_UNSET: 0, STATUS_CODE_OK: 1, STATUS_CODE_ERROR: 2 };

/** Traces that finished more than this long ago don't change: kept, not fetched again. */
const SETTLED_MS = 30_000;
const cache = new Map<string, Trace>();

export const tempoWindow = async (grafana: string, since: number, now: number): Promise<{ traces: Record<string, Trace>; searchMs: number; fetched: number }> => {
  const ds = `${grafana}/api/datasources/proxy/uid`;
  const start = Math.floor((now - since) / 1000);
  const end = Math.ceil(now / 1000) + 60;
  const t0 = performance.now();
  const q = new URLSearchParams({ q: '{resource.service.name="acme"}', limit: "300", start: String(start), end: String(end) });
  const found = (await (await fetch(`${ds}/tempo/api/search?${q}`)).json()) as { traces?: Array<{ traceID: string; startTimeUnixNano: string; durationMs?: number }> };
  const searchMs = performance.now() - t0;
  const ids = (found.traces ?? []).map((t) => ({ id: t.traceID, end: Number(BigInt(t.startTimeUnixNano) / 1_000_000n) + (t.durationMs ?? 0) }));
  let fetched = 0;
  await Promise.all(
    ids.map(async ({ id, end: ended }) => {
      if (cache.has(id) && now - ended > SETTLED_MS) return;
      fetched++;
      const doc = (await (await fetch(`${ds}/tempo/api/v2/traces/${id}`)).json()) as { trace?: { resourceSpans?: Array<any> } };
      const spans: Span[] = (doc.trace?.resourceSpans ?? []).flatMap((rs: any) =>
        (rs.scopeSpans ?? []).flatMap((ss: any) =>
          (ss.spans ?? []).map((s: any): Span => ({
            traceId: id, spanId: hex(s.spanId), parentSpanId: s.parentSpanId ? hex(s.parentSpanId) : "", name: s.name, attrs: attrs(s.attributes),
            status: STATUS[s.status?.code ?? "STATUS_CODE_UNSET"] ?? 0,
            ms: Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6,
            start: Number(BigInt(s.startTimeUnixNano) / 1000n) / 1e3,
          })),
        ),
      );
      cache.set(id, { spans, logs: cache.get(id)?.logs ?? [] });
    }),
  );
  // Logs, once for the whole window, grouped onto their traces by Loki's trace_id label.
  const lq = new URLSearchParams({ query: '{service_name="acme"}', start: `${start}000000000`, end: `${end}000000000`, limit: "5000", direction: "forward" });
  const lokied = (await (await fetch(`${ds}/loki/loki/api/v1/query_range?${lq}`)).json()) as { data?: { result?: Array<{ stream: Record<string, string>; values: Array<[string, string]> }> } };
  const logs = new Map<string, Log[]>();
  for (const s of lokied.data?.result ?? []) {
    const trace = s.stream["trace_id"];
    if (!trace) continue;
    const { trace_id: _t, span_id, ...rest } = s.stream;
    for (const [, body] of s.values) (logs.get(trace) ?? logs.set(trace, []).get(trace)!).push({ traceId: trace, spanId: span_id ?? "", body, attrs: rest });
  }
  const traces: Record<string, Trace> = {};
  for (const { id } of ids) {
    const t = cache.get(id);
    if (t) traces[id] = { spans: t.spans, logs: logs.get(id) ?? [] };
  }
  return { traces, searchMs, fetched };
};
