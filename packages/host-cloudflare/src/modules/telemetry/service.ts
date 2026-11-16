import { Layer, ManagedRuntime, type Context } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpLogger, OtlpSerialization, OtlpTracer } from "effect/observability";
import type { TelemetryApi } from "./types.ts";

const exporters = (url: string, serviceName: string) => {
  const options = { resource: { serviceName }, exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" } as const;
  return Layer.mergeAll(
    OtlpTracer.layer({ url: `${url}/v1/traces`, ...options }),
    OtlpLogger.layer({ url: `${url}/v1/logs`, ...options }),
  ).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));
};

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const hex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

export const Telemetry: TelemetryApi = {
  serve: ({ url, service, handler, waitUntil }, request) => {
    const given = request.headers.get("traceparent")?.match(TRACEPARENT);
    const trace = given?.[1] ?? hex(16);
    const headers = new Headers(request.headers);
    if (!given) headers.set("traceparent", `00-${trace}-${hex(8)}-01`);
    const traced = new Request(request, { headers });
    const answered = (response: Response) => {
      const out = new Response(response.body, response);
      out.headers.set("x-trace-id", trace);
      return out;
    };
    if (!url) return handler(traced).then(answered);
    // One runtime per request: its exporters are flushed when it is disposed, after the response, under waitUntil.
    const runtime = ManagedRuntime.make(exporters(url, service));
    // Disposed whether the handler answers or throws, so a failed request still exports what it recorded.
    return runtime
      .context()
      .then((context) => handler(traced, context as unknown as Context.Context<never>))
      .finally(() => waitUntil(runtime.dispose()))
      .then(answered);
  },
};
