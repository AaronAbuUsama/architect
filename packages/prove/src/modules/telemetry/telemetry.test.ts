import { resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Collectors } from "./service.ts";

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
});
