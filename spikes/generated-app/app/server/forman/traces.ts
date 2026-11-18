// The Collector's files, read the way prove's FileSource reads them (packages/prove/src/modules/telemetry/internal/otlp.ts,
// parsing copied), with prove's `window` and `find`. One difference: it reads only the bytes added since the last read,
// so a long `forman dev` with a 50 MB file costs a tail read per poll, not a reparse. A file that shrank is read afresh.
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { join } from "node:path";

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly ms: number;
  /** Milliseconds since the epoch. */
  readonly start: number;
}
export interface Log { readonly traceId: string; readonly spanId: string; readonly body: string; readonly attrs: Readonly<Record<string, unknown>>; readonly at: number }
export interface Trace { readonly id: string; readonly spans: Span[]; readonly logs: Log[]; first: number }

const value = (v: any): unknown =>
  v === undefined ? undefined
  : "stringValue" in v ? v.stringValue
  : "intValue" in v ? Number(v.intValue)
  : "boolValue" in v ? v.boolValue
  : "doubleValue" in v ? v.doubleValue
  : "arrayValue" in v ? (v.arrayValue.values ?? []).map(value)
  : JSON.stringify(v);
const attrs = (kvs: ReadonlyArray<any> = []) => Object.fromEntries(kvs.map((kv) => [kv.key, value(kv.value)]));

const spansOf = (doc: any): Span[] =>
  (doc.resourceSpans ?? []).flatMap((rs: any) => (rs.scopeSpans ?? []).flatMap((ss: any) => (ss.spans ?? []).map((s: any): Span => ({
    traceId: s.traceId, spanId: s.spanId, parentSpanId: s.parentSpanId ?? "", name: s.name, attrs: attrs(s.attributes),
    status: s.status?.code ?? 0, ms: Number(BigInt(s.endTimeUnixNano) - BigInt(s.startTimeUnixNano)) / 1e6,
    start: Number(BigInt(s.startTimeUnixNano) / 1000n) / 1e3,
  }))));
const logsOf = (doc: any): Log[] =>
  (doc.resourceLogs ?? []).flatMap((rl: any) => (rl.scopeLogs ?? []).flatMap((sl: any) => (sl.logRecords ?? []).map((l: any): Log => {
    const body = value(l.body);
    return { traceId: l.traceId ?? "", spanId: l.spanId ?? "", body: Array.isArray(body) ? body.join(" ") : String(body), attrs: attrs(l.attributes), at: Number(BigInt(l.timeUnixNano ?? "0") / 1000000n) };
  })));

/** One JSONL file read incrementally: where it got to, and the half line it stopped in. */
interface Tail { offset: number; rest: string; inode: number }

export interface TraceSource {
  /** Every trace with a span that started in the last `since` ms, newest first. */
  readonly window: (since: number, now: number) => ReadonlyArray<Trace>;
  readonly find: (id: string) => Trace | undefined;
  /** What it has read: bytes, traces, and how long the last refresh took. */
  readonly stats: () => { bytes: number; traces: number; refreshMs: number; dir: string };
}

export const fileSource = (dir: string): TraceSource => {
  const byId = new Map<string, Trace>();
  const tails = new Map<string, Tail>();
  let bytes = 0;
  let refreshMs = 0;

  const at = (id: string, start: number) => {
    const t = byId.get(id) ?? byId.set(id, { id, spans: [], logs: [], first: start }).get(id)!;
    if (start > 0 && start < t.first) t.first = start;
    return t;
  };

  const readNew = (file: string, each: (doc: any) => void) => {
    if (!existsSync(file)) return;
    const st = statSync(file);
    let tail = tails.get(file);
    if (!tail || st.size < tail.offset || st.ino !== tail.inode) {
      if (tail) byId.clear(); // the file was replaced or cut: start again rather than mix old and new
      tail = { offset: 0, rest: "", inode: st.ino };
      tails.set(file, tail);
    }
    if (st.size === tail.offset) return;
    const fd = openSync(file, "r");
    const buf = Buffer.alloc(st.size - tail.offset);
    readSync(fd, buf, 0, buf.length, tail.offset);
    closeSync(fd);
    bytes += buf.length;
    tail.offset = st.size;
    const lines = (tail.rest + buf.toString("utf8")).split("\n");
    tail.rest = lines.pop() ?? ""; // whole lines only: the exporter may be mid-line
    for (const l of lines) if (l.trim() !== "") each(JSON.parse(l));
  };

  const refresh = () => {
    const t0 = performance.now();
    readNew(join(dir, "traces.jsonl"), (d) => { for (const s of spansOf(d)) at(s.traceId, s.start).spans.push(s); });
    readNew(join(dir, "logs.jsonl"), (d) => { for (const l of logsOf(d)) at(l.traceId, 0).logs.push(l); });
    refreshMs = performance.now() - t0;
  };

  return {
    window: (since, now) => {
      refresh();
      const from = now - since;
      return [...byId.values()].filter((t) => t.spans.length > 0 && t.first >= from).sort((a, b) => b.first - a.first);
    },
    find: (id) => {
      refresh();
      return byId.get(id);
    },
    stats: () => ({ bytes, traces: byId.size, refreshMs, dir }),
  };
};
