import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Collectors } from "./service.ts";
import { removeCollector, runCollector } from "./internal/docker.ts";

const dir = resolve(import.meta.dirname, "../../../test/tmp/collector");
const hex = (n: number) => Array.from({ length: n }, (_, i) => ((i * 7 + 3) % 16).toString(16)).join("");

describe("the collector, in Docker", () => {
  it("takes an OTLP span over HTTP and reads it back by trace id once complete", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.start(dir);
      const trace = hex(32);
      const parent = "00000000000000aa";
      const span = (id: string, parentId: string, name: string) => ({
        traceId: trace, spanId: id, parentSpanId: parentId, name, kind: 2,
        startTimeUnixNano: "1000000000", endTimeUnixNano: "1005000000",
        attributes: [{ key: "answer.allowance", value: { intValue: "500" } }],
      });
      const body = { resourceSpans: [{ resource: { attributes: [] }, scopeSpans: [{ spans: [span("00000000000000b1", parent, "POST /allowance/grant"), span("00000000000000b2", "00000000000000b1", "allowance.grant")] }] }] };
      const sent = yield* Effect.promise(() => fetch(`${collector.url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      expect(sent.status).toBe(200);
      const got = (yield* collector.traces([{ trace, parent }])).get(trace)!;
      expect(got.spans.map((s) => s.name).sort()).toEqual(["POST /allowance/grant", "allowance.grant"]);
      expect(got.spans.find((s) => s.name === "allowance.grant")!.attrs["answer.allowance"]).toBe(500);
      expect(got.spans[0]!.ms).toBe(5);
    }))),
  );

  it("drops the person from a record before anything else sees it: user.*, organization.id, on spans and resources", { timeout: 60_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const collector = yield* Collectors.start(dir);
      const trace = hex(32);
      const kv = (key: string) => ({ key, value: { stringValue: "someone@example.com" } });
      const body = { resourceSpans: [{
        resource: { attributes: [kv("service.name"), kv("user.email"), kv("organization.id")] },
        scopeSpans: [{ spans: [{ traceId: trace, spanId: "00000000000000c1", parentSpanId: "", name: "agent", kind: 1, startTimeUnixNano: "1", endTimeUnixNano: "2", attributes: [kv("user.email"), kv("user.account_uuid"), kv("user.account_id"), kv("organization.id"), kv("tool")] }] }],
      }] };
      yield* Effect.promise(() => fetch(`${collector.url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
      const got = (yield* collector.traces([{ trace, parent: "00000000000000c1" }])).get(trace)!;
      const span = got.spans.find((s) => s.name === "agent")!;
      expect(Object.keys(span.attrs)).toEqual(["tool"]);
      expect(readFileSync(`${dir}/traces.jsonl`, "utf8")).not.toMatch(/user\.|organization\.id/);
    }))),
  );

  it("removes a collector whose owner process is gone at the next start, and leaves a live owner's alone", { timeout: 90_000 }, () =>
    Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      // A process that has exited: its pid is a dead owner. Another is this process: a live one.
      const gone = spawnSync(process.execPath, ["-e", ""]);
      const deadPid = gone.pid;
      const orphan = `ortho-collector-${deadPid}-1`;
      const alive = `ortho-collector-${process.pid}-2`;
      const spare = resolve(import.meta.dirname, "../../../test/tmp/orphans");
      for (const n of [orphan, alive]) {
        mkdirSync(`${spare}/${n}`, { recursive: true });
        yield* runCollector(`${spare}/${n}`, n, { strip: [], viewer: undefined });
      }
      const names = () => spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" }).stdout.split("\n");
      expect(names()).toContain(orphan);
      yield* Collectors.start(dir);
      expect(names()).not.toContain(orphan);
      expect(names()).toContain(alive);
      yield* removeCollector(alive);
    }))),
  );
});
