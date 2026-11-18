// L2.09's done-when, in-process: `watch` over a hand-built TraceSource in the shape of staging traffic. A healthy window
// prints p95 against budget and the refusal counts; a slow spend is drift, and drift is written as a task; prove's own
// traffic is not counted. The real thing, replayed traffic against a staging world, is Gate 2's check 8.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Span, Trace, TraceSource } from "#modules/telemetry/types.js";
import { PROVE_SPAN_PREFIX } from "#modules/telemetry/service.js";
import { Watch } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "tmp/watch");
const root = join(scratch, "acme");

beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

let n = 0;
const hex = (len: number, seed: number) => (seed.toString(16).padStart(len, "0")).slice(-len);
const span = (trace: string, id: string, parent: string, name: string, ms: number, attrs: Record<string, unknown> = {}, status = 1): Span =>
  ({ traceId: trace, spanId: id, parentSpanId: parent, name, attrs, status, ms, start: 1_000 + n });

/** One call of `op` as staging records it: the HTTP span, the operation's span, and its two steps; a refusal or a defect on request. */
const call = (op: string, ms: number, how: { refused?: string; defect?: boolean; parent?: string; log?: boolean } = {}): [string, Trace] => {
  const id = hex(32, ++n);
  const [a, b, c, d] = [hex(16, n * 10 + 1), hex(16, n * 10 + 2), hex(16, n * 10 + 3), hex(16, n * 10 + 4)];
  const attrs = how.refused ? { refusal: how.refused } : how.defect ? { defect: "Error: boom" } : { "answer.remaining": "80" };
  const spans = [
    span(id, a, how.parent ?? "", "POST", ms),
    span(id, b, a, op, ms, attrs, how.defect ? 2 : 1),
    ...(how.refused || how.defect ? [] : [span(id, c, b, `${op}.load`, 1, { "step.kind": "database" }), span(id, d, b, `${op}.record`, 1, { "step.kind": "database" })]),
  ];
  // The two steps start after each other, in the declared order.
  const ordered = spans.map((s, i) => ({ ...s, start: s.start + i }));
  return [id, { spans: ordered, logs: how.refused === "AllowanceExceeded" ? [{ traceId: id, spanId: b, body: "the amount is more than is left", attrs: {} }] : [] }];
};

const source = (calls: ReadonlyArray<[string, Trace]>): TraceSource => ({
  traces: (wanted) => Effect.succeed(new Map(calls.filter(([id]) => wanted.some((w) => w.trace === id)))),
  find: (id) => Effect.succeed(calls.find(([k]) => k === id)?.[1]),
  window: () => Effect.succeed(new Map(calls)),
});

const watch = (calls: ReadonlyArray<[string, Trace]>) =>
  Effect.runPromise(Watch.run({ root, environment: "staging", source: "file", since: 3_600_000, use: source(calls), env: {} }));

describe("watch over staging's traffic", { timeout: 120_000 }, () => {
  it("prints p95 against budget, the refusal counts and `drift none` for a healthy window", async () => {
    const calls = [...Array.from({ length: 30 }, () => call("allowance.spend", 12)), ...Array.from({ length: 3 }, () => call("allowance.spend", 8, { refused: "AllowanceExceeded" }))];
    const report = await watch(calls);
    expect(report.lines).toContain("allowance.spend p95 12ms (budget 150ms) ✔");
    expect(report.lines.find((l) => l.startsWith("refusals:"))).toMatch(/^refusals: AllowanceExceeded 3 \(AL-\d+\)$/);
    expect(report.lines).toContain("defects: none");
    expect(report.lines).toContain("drift none");
    expect(report.drift).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.lines.filter((l) => l.startsWith("task "))).toEqual([]);
  });

  it("a slow handler is drift, and drift becomes a task that the next clean watch removes", async () => {
    const slow = await watch(Array.from({ length: 30 }, () => call("allowance.spend", 800)));
    expect(slow.lines).toContain("allowance.spend p95 800ms (budget 150ms) ✘");
    expect(slow.lines).toContain("drift allowance.spend");
    expect(slow.drift).toEqual(["allowance.spend"]);
    expect(slow.passed).toBe(true); // drift is a task, not a failed run
    const file = join(root, ".ortho/tasks/drift-staging-allowance.spend.md");
    expect(slow.lines).toContain("task .ortho/tasks/drift-staging-allowance.spend.md");
    expect(existsSync(file)).toBe(true);
    const text = readFileSync(file, "utf8");
    expect(text).toContain("p95 800ms");
    expect(text).toContain("budget of 150ms");
    expect(text).toMatch(/ortho telemetry trace [0-9a-f]{32} --env staging/);
    expect(text).toContain("ortho brief allowance.spend");

    const fixed = await watch(Array.from({ length: 30 }, () => call("allowance.spend", 20)));
    expect(fixed.drift).toEqual([]);
    expect(existsSync(file)).toBe(false);
    expect(readdirSync(join(root, ".ortho/tasks"))).toEqual([]);
  });

  it("says, and does not call drift, a p95 over budget on too few calls: with a handful, the p95 is only the slowest call", async () => {
    const report = await watch([call("allowance.spend", 900), call("allowance.spend", 10), call("allowance.spend", 10)]);
    expect(report.lines).toContain("allowance.spend p95 900ms (budget 150ms) ✔");
    expect(report.lines.some((l) => l.startsWith("thin: allowance.spend p95 900ms") && l.includes("3 calls"))).toBe(true);
    expect(report.lines).toContain("drift none");
    expect(report.tasks).toEqual([]);
  });

  it("does not count prove's own calls, which carry a caller span of prove's making", async () => {
    const prove = Array.from({ length: 5 }, () => call("allowance.spend", 900, { parent: `${PROVE_SPAN_PREFIX}${hex(16 - PROVE_SPAN_PREFIX.length, n + 1)}` }));
    const real = Array.from({ length: 10 }, () => call("allowance.spend", 10));
    const report = await watch([...prove, ...real]);
    expect(report.lines).toContain("allowance.spend p95 10ms (budget 150ms) ✔");
    expect(report.drift).toEqual([]);
  });

  it("counts a defect apart from a refusal, and judges the same evals except coverage: a refusal the operation does not declare fails", async () => {
    const report = await watch([call("allowance.spend", 5, { defect: true }), call("allowance.spend", 5, { refused: "Boom" })]);
    expect(report.lines).toContain("defects: allowance.spend 1");
    expect(report.lines.some((l) => l.startsWith("✘ declared errors allowance.spend") && l.includes("refused with Boom"))).toBe(true);
    expect(report.lines.some((l) => /coverage/.test(l) && l.startsWith("✘"))).toBe(false);
    expect(report.passed).toBe(false);
  });

  it("leaves a replayed call's answer to prove: it answers from what was stored, so its span carries none", async () => {
    const [id, trace] = call("allowance.spend", 5);
    const replayed: [string, Trace] = [id, { ...trace, spans: trace.spans.map((s) => (s.name === "allowance.spend" ? { ...s, attrs: { "request.replayed": true } } : s)) }];
    const report = await watch([replayed]);
    expect(report.lines.filter((l) => l.startsWith("✘"))).toEqual([]);
    expect(report.passed).toBe(true);
  });

  it("says plainly when the window holds no traffic", async () => {
    const report = await watch([]);
    expect(report.lines).toContain("no calls in the window");
    expect(report.lines).toContain("drift none");
  });
});
