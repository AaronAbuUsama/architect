import { Layer, ManagedRuntime, type Context } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpLogger, OtlpSerialization, OtlpTracer } from "effect/observability";
import type { Exporter, TelemetryApi } from "./types.ts";
import { BASE, collectorOf, fanOut, sinksOf } from "./internal/exporters.ts";

const exporters = (targets: ReadonlyArray<Exporter>, serviceName: string, environment: string | undefined) => {
  // The environment is on the resource, so every span and log of the request carries it, in every sink.
  const attributes = environment === undefined ? {} : { "deployment.environment": environment, "deployment.environment.name": environment };
  const options = { resource: { serviceName, attributes }, exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" } as const;
  return Layer.mergeAll(
    OtlpTracer.layer({ url: `${BASE}/v1/traces`, ...options }),
    OtlpLogger.layer({ url: `${BASE}/v1/logs`, ...options }),
  ).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(Layer.succeed(FetchHttpClient.Fetch, fanOut(targets, globalThis.fetch.bind(globalThis)))),
  );
};

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const hex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

/** Set by `configure`: the environment's sinks and name, for this isolate. */
let configured: { sinks: string | undefined; environment: string | undefined } = { sinks: undefined, environment: undefined };

export const Telemetry: TelemetryApi = {
  configure: (options) => {
    configured = options;
  },
  serve: ({ url, sinks = configured.sinks, environment = configured.environment, service, handler, waitUntil }, request) => {
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
    const targets = [...(url ? [collectorOf(url)] : []), ...sinksOf(sinks)];
    if (targets.length === 0) return handler(traced).then(answered);
    // One runtime per request: its exporters are flushed when it is disposed, after the response, under waitUntil.
    const runtime = ManagedRuntime.make(exporters(targets, service, environment));
    // Disposed whether the handler answers or throws, so a failed request still exports what it recorded.
    return runtime
      .context()
      .then((context) => handler(traced, context as unknown as Context.Context<never>))
      .finally(() => waitUntil(runtime.dispose()))
      .then(answered);
  },
};
