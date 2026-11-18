// `forman watch --env staging` as a command: it reads the environment's own telemetry folder (what staging's Collector
// wrote) and prints what the check of Gate 2 looks for. The traffic here is written by hand in the Collector's format; the
// replayed-traffic version is Gate 2's check 8.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WatchCommand } from "./service.ts";

const visible = (from: string) => !basename(from).startsWith(".");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "tmp/cli-watch");
const root = join(scratch, "acme");
const folder = join(root, ".forman/environments/staging/telemetry");

const kv = (key: string, value: string) => ({ key, value: { stringValue: value } });
const nanos = (ms: number) => String(BigInt(Math.round(ms)) * 1_000_000n);
let n = 0;
const hex = (len: number) => (++n).toString(16).padStart(len, "0");
/** One `allowance.spend` call as the Collector writes it: the HTTP span and the operation's span, `ms` long, just now. */
const call = (ms: number, refusal?: string) => {
  const [trace, post, op] = [hex(32), hex(16), hex(16)];
  const start = Date.now() - 5_000;
  const span = (id: string, parent: string, name: string, attributes: Array<ReturnType<typeof kv>>) =>
    ({ traceId: trace, spanId: id, parentSpanId: parent, name, kind: 1, startTimeUnixNano: nanos(start), endTimeUnixNano: nanos(start + ms), attributes, status: { code: 1 } });
  return [span(post, "", "POST", []), span(op, post, "allowance.spend", refusal ? [kv("refusal", refusal)] : [kv("answer.remaining", "80")])]
    .concat(refusal ? [] : [span(hex(16), op, "allowance.spend.load", [kv("step.kind", "database")]), span(hex(16), op, "allowance.spend.record", [kv("step.kind", "database")])])
    .map((s, i) => (i < 2 ? s : { ...s, startTimeUnixNano: nanos(start + i), endTimeUnixNano: nanos(start + i + 1) }));
};
/** The deciding log of a refused call: it sits inside the operation's span. */
const logOf = (spans: ReadonlyArray<object>) => {
  const op = spans[1] as { traceId: string; spanId: string };
  return JSON.stringify({ resourceLogs: [{ scopeLogs: [{ logRecords: [{ traceId: op.traceId, spanId: op.spanId, body: { stringValue: "the amount is more than is left" }, attributes: [] }] }] }] });
};
const record = (calls: ReadonlyArray<ReadonlyArray<object>>) => {
  writeFileSync(join(folder, "traces.jsonl"), calls.map((spans) => JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] })).join("\n") + "\n");
  writeFileSync(join(folder, "logs.jsonl"), calls.filter((spans) => spans.length === 2).map(logOf).join("\n") + "\n");
};

beforeAll(() => {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true, filter: visible });
  writeFileSync(join(root, "tsconfig.json"), JSON.stringify({ extends: relative(root, join(acme, "tsconfig.json")) }));
  mkdirSync(folder, { recursive: true });
});
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const watch = (extra: Partial<Parameters<typeof WatchCommand.run>[0]> = {}) =>
  Effect.runPromise(WatchCommand.run({ root, environment: "staging", source: "file", since: "1h", env: {}, ...extra }));

describe("forman watch --env staging", { timeout: 120_000 }, () => {
  it("prints each operation's p95 against its budget, the refusal counts and `drift none`, and exits 0", async () => {
    record([...Array.from({ length: 30 }, () => call(14)), ...Array.from({ length: 3 }, () => call(6, "AllowanceExceeded"))]);
    const said = await watch();
    const lines = said.out.split("\n");
    expect(said.exit, said.err).toBe(0);
    expect(lines).toContain("allowance.spend p95 14ms (budget 150ms) ✔");
    expect(lines.find((l) => l.startsWith("refusals:"))).toMatch(/AllowanceExceeded 3\b/);
    expect(lines).toContain("drift none");
  });

  it("a slow handler shows as drift, still exits 0 (drift is a task, not a failed run), and leaves its task", async () => {
    record(Array.from({ length: 30 }, () => call(800)));
    const said = await watch();
    const lines = said.out.split("\n");
    expect(said.exit).toBe(0);
    expect(lines).toContain("allowance.spend p95 800ms (budget 150ms) ✘");
    expect(lines).toContain("drift allowance.spend");
    expect(lines).toContain("task .forman/tasks/drift-staging-allowance.spend.md");
  });

  it("refuses with the way forward when the environment has recorded nothing, or the source is Axiom and the sink isn't named", async () => {
    const none = await watch({ environment: "production" });
    expect([none.exit, none.err]).toEqual([2, expect.stringContaining("forman env up production")]);
    const axiom = await watch({ source: "axiom" });
    expect(axiom.exit).toBe(2);
    expect(axiom.err).toContain("Telemetry.sink.axiom");
    expect((await watch({ since: "soon" })).err).toContain("--since");
  });
});
