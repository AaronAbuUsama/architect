// Reader: what `prove` would do. Node 24+, no dependencies. Two stores, one shape.
import { closeSync, openSync, readSync, statSync } from "node:fs"

export interface Span {
  traceId: string; spanId: string; parentSpanId: string; name: string; service: string
  attrs: Record<string, unknown>; status: number; startNs: bigint; endNs: bigint
  events: { name: string; attrs: Record<string, unknown> }[]
}
export interface Log { traceId: string; spanId: string; service: string; body: string; severity: string; timeNs: bigint }
export interface Trace { spans: Span[]; logs: Log[] }

const val = (v: any): unknown =>
  v === undefined ? undefined : "stringValue" in v ? v.stringValue : "intValue" in v ? Number(v.intValue)
  : "boolValue" in v ? v.boolValue : "doubleValue" in v ? v.doubleValue
  : "arrayValue" in v ? (v.arrayValue.values ?? []).map(val) : JSON.stringify(v)
const attrs = (kvs: any[] = []) => Object.fromEntries(kvs.map((kv) => [kv.key, val(kv.value)]))
const service = (res: any) => String(attrs(res?.attributes)["service.name"] ?? "?")

export const spansOf = (doc: any): Span[] =>
  (doc.resourceSpans ?? []).flatMap((rs: any) =>
    (rs.scopeSpans ?? []).flatMap((ss: any) =>
      (ss.spans ?? []).map((s: any): Span => ({
        traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId ?? "", name: s.name,
        service: service(rs.resource), attrs: attrs(s.attributes), status: s.status?.code ?? 0,
        startNs: BigInt(s.startTimeUnixNano), endNs: BigInt(s.endTimeUnixNano),
        events: (s.events ?? []).map((e: any) => ({ name: e.name, attrs: attrs(e.attributes) })),
      }))))

export const logsOf = (doc: any): Log[] =>
  (doc.resourceLogs ?? []).flatMap((rl: any) =>
    (rl.scopeLogs ?? []).flatMap((sl: any) =>
      (sl.logRecords ?? []).map((l: any): Log => ({
        traceId: l.traceId ?? "", spanId: l.spanId ?? "", service: service(rl.resource),
        body: Array.isArray(val(l.body)) ? (val(l.body) as unknown[]).join(" ") : String(val(l.body)),
        severity: l.severityText ?? "", timeNs: BigInt(l.timeUnixNano),
      }))))

/** Option (a): tail the collector's file exporter output, index by trace id. */
export class FileStore {
  private offsets = new Map<string, number>()
  private partial = new Map<string, string>()
  private spans = new Map<string, Span[]>()
  private logs = new Map<string, Log[]>()
  private dir: string
  constructor(dir: string) { this.dir = dir }
  private pull(file: string, onDoc: (d: any) => void) {
    const path = `${this.dir}/${file}`
    const size = statSync(path).size
    let off = this.offsets.get(path) ?? 0
    if (size < off) off = 0 // truncated
    if (size === off) return
    const buf = Buffer.alloc(size - off)
    const fd = openSync(path, "r"); readSync(fd, buf, 0, buf.length, off); closeSync(fd)
    this.offsets.set(path, size)
    const lines = ((this.partial.get(path) ?? "") + buf.toString("utf8")).split("\n")
    this.partial.set(path, lines.pop() ?? "") // last element is an incomplete line (or "")
    for (const l of lines) if (l) onDoc(JSON.parse(l))
  }
  async read(traceId: string): Promise<Trace> {
    this.pull("traces.jsonl", (d) => { for (const s of spansOf(d)) (this.spans.get(s.traceId) ?? this.spans.set(s.traceId, []).get(s.traceId)!).push(s) })
    this.pull("logs.jsonl", (d) => { for (const l of logsOf(d)) (this.logs.get(l.traceId) ?? this.logs.set(l.traceId, []).get(l.traceId)!).push(l) })
    return { spans: this.spans.get(traceId) ?? [], logs: this.logs.get(traceId) ?? [] }
  }
}

/** Option (b): Jaeger v2 query API. Traces only; log lines come back as span events. */
export class JaegerStore {
  private base: string
  constructor(base = "http://127.0.0.1:16686") { this.base = base }
  async read(traceId: string): Promise<Trace> {
    const r = await fetch(`${this.base}/api/v3/traces/${traceId}`)
    if (r.status === 404) return { spans: [], logs: [] }
    const spans = spansOf((await r.json()).result ?? {})
    const logs: Log[] = spans.flatMap((s) => s.events.map((e) => ({ traceId, spanId: s.spanId, service: s.service, body: e.name, severity: String(e.attrs["effect.logLevel"] ?? ""), timeNs: s.startNs })))
    return { spans, logs }
  }
}

export const tree = (t: Trace): string => {
  const kids = new Map<string, Span[]>()
  for (const s of t.spans) (kids.get(s.parentSpanId) ?? kids.set(s.parentSpanId, []).get(s.parentSpanId)!).push(s)
  for (const a of kids.values()) a.sort((x, y) => (x.startNs < y.startNs ? -1 : 1))
  const ids = new Set(t.spans.map((s) => s.spanId))
  const roots = t.spans.filter((s) => !ids.has(s.parentSpanId))
  const out: string[] = []
  const walk = (s: Span, d: number) => {
    const ms = Number(s.endNs - s.startNs) / 1e6
    const a = Object.entries(s.attrs).map(([k, v]) => `${k}=${v}`).join(" ")
    out.push(`${"  ".repeat(d)}${s.name} [${s.service}] ${ms.toFixed(0)}ms status=${["unset", "ok", "error"][s.status]}${a ? " {" + a + "}" : ""}`)
    for (const l of t.logs.filter((l) => l.spanId === s.spanId).sort((x, y) => (x.timeNs < y.timeNs ? -1 : 1))) out.push(`${"  ".repeat(d + 1)}log ${l.severity}: ${l.body}`)
    for (const c of kids.get(s.spanId) ?? []) walk(c, d + 1)
  }
  roots.forEach((r) => walk(r, 0))
  return out.join("\n")
}

/** What a complete trace of this spike's request looks like. */
export const EXPECTED_SPANS = ["worker.fetch", "worker.step.validate", "worker.step.load", "worker.call-do", "do.run", "do.storage.incr", "do.compute"]
export const EXPECTED_LOGS = 6

export const complete = (t: Trace): { ok: boolean; why: string } => {
  const names = t.spans.map((s) => s.name).sort()
  const want = [...EXPECTED_SPANS].sort()
  if (JSON.stringify(names) !== JSON.stringify(want)) return { ok: false, why: `spans ${names.length}/${want.length}` }
  if (t.logs.length < EXPECTED_LOGS) return { ok: false, why: `logs ${t.logs.length}/${EXPECTED_LOGS}` }
  const ids = new Set(t.spans.map((s) => s.spanId))
  const orphans = t.spans.filter((s) => s.parentSpanId && !ids.has(s.parentSpanId) && s.name !== "worker.fetch")
  if (orphans.length) return { ok: false, why: `orphans ${orphans.map((o) => o.name)}` }
  return { ok: true, why: "complete" }
}
