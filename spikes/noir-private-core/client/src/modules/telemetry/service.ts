import { Context, Exit, Tracer } from "effect";
import type { Monitor } from "./types.js";

const attributes = new Set(["architect.operation", "architect.runs", "architect.outcome", "architect.step"]);
const operations = new Set(["publishClass", "initialize", "deposit", "grant", "spend", "revoke", "ordinary", "directTokenBypass"]);
const steps = new Set(["request", "sync", "prove", "submit", "wait", "read"]);
const outcomes = new Set(["ok", "AllowanceExceeded", "AllowanceNotAdmin", "AllowanceNotMember", "NetworkRejected", "AztecFailure"]);
const logLevels = new Set([0, 10, 20, 25, 30, 40, 50, 60]);
const names = new Set(["timer", "refusal", ...steps, ...[...operations].map((op) => `private-core.${op}`)]);
function safeValue(key: string, value: unknown) {
  if (typeof value !== "string") return false;
  if (key === "architect.operation") return operations.has(value);
  if (key === "architect.step") return steps.has(value);
  if (key === "architect.outcome") return outcomes.has(value);
  return key === "architect.runs" && value === "client";
}
const json = (value: unknown) => JSON.stringify(value, (_, v: unknown) => typeof v === "bigint" ? v.toString() : v);
export function failureCategory(error: unknown): "assertion" | "operation" {
  return error instanceof Error && error.name === "AssertionError" ? "assertion" : "operation";
}

// Neither a failed span's cause nor a library's formatted message is safe to
// export. Keep only fixed metadata. Raw SDK logs are scanned in memory and then
// discarded; no raw line, address, argument or typed refusal payload is saved.
export function makeMonitor(): Monitor {
  const spans: Tracer.NativeSpan[] = [];
  const rawHits = new Set<number>();
  const logs: { source: string; level: number; event: string }[] = [];
  const needles = new Set<string>();
  const tracer = Tracer.make({ span(options) {
    const span = new Tracer.NativeSpan({ ...options, name: names.has(options.name) ? options.name : "redacted", links: [], annotations: Context.empty() });
    const end = span.end.bind(span);
    span.end = (time, exit) => end(time, Exit.isFailure(exit) ? Exit.fail("refused") : Exit.void);
    span.attribute = (key, value) => { if (attributes.has(key) && safeValue(key, value)) span.attributes.set(key, value); };
    span.event = () => {};
    spans.push(span);
    return span;
  } });
  function watch(value: string | bigint) {
    if (typeof value === "bigint") {
      if (value > 99n) {
        needles.add(`\"${value}\"`);
        needles.add(`:${value},`);
        needles.add(`:${value}}`);
        needles.add(` ${value} `);
        needles.add(value.toString(16).padStart(64, "0"));
        needles.add(value.toString(16).padStart(8, "0"));
      }
    } else if (value.length >= 12) {
      needles.add(value.toLowerCase());
      if (value.startsWith("0x")) needles.add(value.slice(2).toLowerCase());
    }
  }
  function log(text: string) {
    for (const line of text.split("\n").filter(Boolean)) {
      // Inspect transient input; retain only matched watch-list indexes.
      // Raw SDK message text is never retained by the recording adapter.
      let index = 0;
      const lower = line.toLowerCase();
      for (const needle of needles) {
        if (lower.includes(needle)) rawHits.add(index);
        index++;
      }
      // Parsing failures are reduced to metadata too. Log text never leaves memory.
      const level = Number(/"level":(\d+)/.exec(line)?.[1] ?? 0);
      logs.push({ source: "aztec-library", level: logLevels.has(level) ? level : 0, event: "message-redacted" });
    }
  }
  const leaks = (text: string) => [...needles].filter((n) => text.toLowerCase().includes(n)).length;
  function report() {
    const recorded = spans.map((s) => ({ name: s.name, spanId: s.spanId, traceId: s.traceId, parentSpanId: s.parent._tag === "Some" ? s.parent.value.spanId : undefined, status: s.status, attributes: Object.fromEntries(s.attributes), events: s.events, links: s.links, annotations: [] }));
    return { spans: recorded, logs, spanLeaks: leaks(json(recorded)), rawLibraryLogLeaks: rawHits.size, recordedLibraryLogLeaks: leaks(json(logs)), tracked: needles.size };
  }
  return { tracer, log, watch, report };
}
