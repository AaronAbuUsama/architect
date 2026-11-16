import { describe, expect, it } from "vitest";
import { Telemetry } from "./service.ts";

const echo = (request: Request) => Promise.resolve(new Response(request.headers.get("traceparent")));
const serve = (request: Request) => Telemetry.serve({ url: undefined, service: "test", handler: echo, waitUntil: () => undefined }, request);

describe("telemetry, in workerd", () => {
  it("keeps a caller's trace and answers with its id", async () => {
    const parent = "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01";
    const response = await serve(new Request("http://w/", { headers: { traceparent: parent } }));
    expect(response.headers.get("x-trace-id")).toBe("0123456789abcdef0123456789abcdef");
    expect(await response.text()).toBe(parent);
  });

  it("mints a trace when the caller has none, and the handler sees it", async () => {
    const response = await serve(new Request("http://w/"));
    const trace = response.headers.get("x-trace-id")!;
    expect(trace).toMatch(/^[0-9a-f]{32}$/);
    expect(await response.text()).toContain(trace);
  });
});
