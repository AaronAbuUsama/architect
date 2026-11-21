import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { PortalLive, WindowSpan, WindowTrace } from "#modules/telemetry/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { MonitorLedger } from "./types.ts";
import { Monitor } from "./service.ts";

const NOW = 1_800_000_000_000;
const MIN = 60_000;
const rule = (target: number) => ({
  id: "latency:a.go", kind: "latency" as const, labels: { environment: "*", operation: "a.go", severity: "page", owner: "blueprint/a.ts" },
  target, windowDays: 28, thresholdMs: 100, minCalls: 2, alerts: [{ name: "fast", burn: 10, windowsMs: [60 * MIN, 5 * MIN], severity: "page" }],
});
const wire = (target = 0.9): BlueprintWire => ({ digest: "d", model: { operations: { "a.go": { hash: "h1", file: "blueprint/a.ts" } }, alertRules: [rule(target)] } }) as unknown as BlueprintWire;

const call = (n: number, ms: number, start = NOW - MIN, defect?: { step: string; tag: string }): readonly [string, WindowTrace] => {
  const id = String(n).padStart(8, "0");
  const op: WindowSpan = { spanId: `s${n}`, parentSpanId: "", name: "a.go", ms, start, status: defect ? 2 : 1, attrs: { operation: "a.go", attempt: 1, ...(defect ? { defect: "Error: x", "error.tag": defect.tag } : {}) } };
  const step: ReadonlyArray<WindowSpan> = defect ? [{ spanId: `t${n}`, parentSpanId: op.spanId, name: `a.go.${defect.step}`, ms: 1, start, status: 2, attrs: {} }] : [];
  return [id, { spans: [op, ...step], logs: [] }];
};
const liveOf = (traces: ReadonlyArray<readonly [string, WindowTrace]>, at = NOW, historyMs?: number): PortalLive => ({
  environment: "local", now: at, windowMs: 30 * MIN, ...(historyMs === undefined ? {} : { historyMs }),
  source: { find: () => Effect.succeed(undefined), window: (since, now) => Effect.succeed(new Map(traces.filter(([, t]) => t.spans.some((s) => s.start >= now - since && s.start <= now)))) },
  metrics: { window: () => Effect.succeed([]) },
});
const held = () => {
  const book = new Map<string, string>();
  const ledger: MonitorLedger = { get: (k) => Effect.sync(() => (book.has(k) ? (JSON.parse(book.get(k)!) as unknown) : undefined)), put: (k, v) => Effect.sync(() => { book.set(k, JSON.stringify(v)); }) };
  return ledger;
};
const read = (w: BlueprintWire, live: PortalLive, ledger?: MonitorLedger) => Effect.runPromise(Monitor.read(w, live, ledger));

describe("alerts", () => {
  it("equality fires: 1 slow call in 10 burns a 0.9 objective at exactly 1, so a rate of 1 fires and 2 does not", async () => {
    const traces = [call(1, 500), ...Array.from({ length: 9 }, (_, i) => call(i + 2, 10))];
    const burning = (burn: number) => ({ ...wire(), model: { ...wire().model, alertRules: [{ ...rule(0.9), alerts: [{ name: "fast", burn, windowsMs: [60 * MIN, 5 * MIN], severity: "page" }] }] } }) as unknown as BlueprintWire;
    expect((await read(burning(1), liveOf(traces))).alerts[0]).toMatchObject({ state: "firing", windows: [{ ms: 60 * MIN, calls: 10, bad: 1 }, { ms: 5 * MIN, calls: 10, bad: 1 }] });
    expect((await read(burning(2), liveOf(traces))).alerts[0]!.state).toBe("ok");
  });

  it("the short window must hold minCalls calls", async () => {
    expect((await read(wire(), liveOf([call(1, 500)]))).alerts[0]!.state).toBe("ok");
    expect((await read(wire(), liveOf([call(1, 500), call(2, 500)]))).alerts[0]!.state).toBe("firing");
  });

  it("a source that cannot be read leaves the alert unknown, never ok", async () => {
    const down: PortalLive = { ...liveOf([]), source: { find: () => Effect.succeed(undefined), window: () => Effect.fail({ message: "down" }) } };
    expect((await read(wire(), down)).alerts[0]!.state).toBe("unknown");
  });

  it("a rule of another environment is not evaluated, and a rule with no burn is unknown", async () => {
    const other = { id: "verdict:j:test", kind: "verdict" as const, labels: { environment: "test", journey: "j", severity: "page", owner: "j.ts" } };
    const anomaly = { id: "anomaly:X-1", kind: "anomaly" as const, labels: { environment: "*", code: "X-1", severity: "ticket", owner: "o" } };
    const w = { ...wire(), model: { ...wire().model, alertRules: [other, anomaly] } } as unknown as BlueprintWire;
    expect((await read(w, liveOf([]))).alerts).toEqual([{ rule: "anomaly:X-1", alert: "anomaly", state: "unknown", severity: "ticket" }]);
  });
});

describe("a source that reaches back only so far", () => {
  const bad = Array.from({ length: 20 }, (_, i) => call(i + 1, 500, NOW - MIN - i));
  const old = Array.from({ length: 200 }, (_, i) => call(i + 100, 10, NOW - 45 * MIN - i));

  it("a window longer than its history is unknown, not judged on the part it holds: 20 recent slow calls among 200 fast ones 45 minutes ago", async () => {
    // The whole hour would hold 20 slow in 220 (not a burn of 10 at 0.9); the 30 minutes the source holds say 20 of 20.
    const seen = await read(wire(), liveOf([...bad, ...old], NOW, 30 * MIN));
    expect(seen.alerts[0]).toEqual({ rule: "latency:a.go", alert: "fast", state: "unknown", severity: "page" });
  });

  it("with the history, the same calls are judged on the whole window", async () => {
    expect((await read(wire(), liveOf([...bad, ...old]))).alerts[0]).toMatchObject({ state: "ok", windows: [{ ms: 60 * MIN, calls: 220, bad: 20 }, { ms: 5 * MIN, calls: 20, bad: 20 }] });
  });

  it("an alert whose windows the source does cover is still evaluated", async () => {
    const short = { ...wire(), model: { ...wire().model, alertRules: [{ ...rule(0.9), alerts: [{ name: "fast", burn: 2, windowsMs: [30 * MIN, 5 * MIN], severity: "page" }] }] } } as unknown as BlueprintWire;
    expect((await read(short, liveOf(bad, NOW, 30 * MIN))).alerts[0]).toMatchObject({ state: "firing" });
  });
});

describe("issues", () => {
  it("two calls overlapping under one trace each keep their own step and tag", async () => {
    const span = (id: string, parent: string, name: string, start: number, extra: Record<string, unknown> = {}): WindowSpan => ({ spanId: id, parentSpanId: parent, name, ms: 100, start, status: 2, attrs: extra });
    const trace: readonly [string, WindowTrace] = ["00000001", { logs: [], spans: [
      span("a1", "", "a.go", NOW - 5 * MIN, { operation: "a.go", attempt: 1, "call.id": "A", "error.tag": "TagA", defect: "x" }),
      span("b1", "", "a.go", NOW - 5 * MIN + 10, { operation: "a.go", attempt: 1, "call.id": "B", "error.tag": "TagB", defect: "x" }),
      span("a2", "a1", "a.go.first", NOW - 5 * MIN + 1), span("b2", "b1", "a.go.second", NOW - 5 * MIN + 11),
    ] }];
    expect((await read(wire(), liveOf([trace]), held())).issues.map((i) => i.key)).toEqual(["a.go/first/TagA", "a.go/second/TagB"]);
  });

  const dies = (n: number, at: number) => call(n, 5, at, { step: "record", tag: "Boom" });

  it("one per operation, step and tag; a second call joins it, and reading again counts nothing twice", async () => {
    const ledger = held();
    const traces = [dies(1, NOW - 2 * MIN), dies(2, NOW - MIN), call(3, 5)];
    const first = await read(wire(), liveOf(traces), ledger);
    expect(first.issues).toEqual([{ key: "a.go/record/Boom", operation: "a.go", step: "record", tag: "Boom", owner: "blueprint/a.ts", occurrences: 2, firstSeen: { at: NOW - 2 * MIN, hash: "h1" }, lastSeen: { at: NOW - MIN, hash: "h1" }, regressed: false }]);
    expect(await read(wire(), liveOf(traces, NOW + MIN), ledger)).toMatchObject({ issues: [{ occurrences: 2 }] });
  });

  it("is kept past the window in the ledger it is handed, and nowhere else", async () => {
    const ledger = held();
    await read(wire(), liveOf([dies(1, NOW - MIN)]), ledger);
    expect((await read(wire(), liveOf([], NOW + 3 * 24 * 60 * MIN), ledger)).issues).toHaveLength(1);
    expect((await read(wire(), liveOf([], NOW + 3 * 24 * 60 * MIN), held())).issues).toEqual([]);
    expect((await read(wire(), liveOf([dies(1, NOW - MIN)]), undefined)).issues).toHaveLength(1);
  });

  it("regressed: the same defect after the operation's own declaration changed; an old call read again is not it", async () => {
    const ledger = held();
    const changed = { ...wire(), model: { ...wire().model, operations: { "a.go": { hash: "h2", file: "blueprint/a.ts" } } } } as unknown as BlueprintWire;
    const old = dies(1, NOW - 5 * MIN);
    await read(wire(), liveOf([old]), ledger);
    expect((await read(changed, liveOf([old], NOW + MIN), ledger)).issues[0]).toMatchObject({ regressed: false });
    const back = dies(2, NOW + 2 * MIN);
    expect((await read(changed, liveOf([old, back], NOW + 3 * MIN), ledger)).issues[0]).toMatchObject({ regressed: true, occurrences: 2, firstSeen: { hash: "h1" }, lastSeen: { hash: "h2" } });
  });

  it("a defect no step span explains opens none, and a ledger holding junk is an empty one", async () => {
    const bare = call(1, 5, NOW - MIN);
    const noStep: readonly [string, WindowTrace] = [bare[0], { ...bare[1], spans: [{ ...bare[1].spans[0]!, status: 2 }] }];
    const junk: MonitorLedger = { get: () => Effect.succeed("nonsense"), put: () => Effect.void };
    expect((await read(wire(), liveOf([noStep]), junk)).issues).toEqual([]);
  });
});
