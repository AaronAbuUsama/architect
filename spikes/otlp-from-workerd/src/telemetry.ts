import { Effect, Layer, Tracer } from "effect"
import { FetchHttpClient } from "effect/http"
import { OtlpLogger, OtlpSerialization, OtlpTracer } from "effect/observability"

/** Tracer + logger exporting OTLP/JSON over fetch. The scope finalizer of this layer flushes both exporters. */
export const telemetry = (baseUrl: string, serviceName: string) =>
  Layer.mergeAll(
    OtlpTracer.layer({
      url: `${baseUrl}/v1/traces`,
      resource: { serviceName },
      exportInterval: "100 millis", // only matters for long requests; dispose flushes the rest
      maxBatchSize: 64,
      shutdownTimeout: "3 seconds",
    }),
    OtlpLogger.layer({
      url: `${baseUrl}/v1/logs`,
      resource: { serviceName },
      exportInterval: "100 millis",
      maxBatchSize: 64,
      shutdownTimeout: "3 seconds",
    }),
  ).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer))

/** `traceparent: 00-<trace>-<span>-01` -> an external parent span, or undefined. */
export const parentFromTraceparent = (header: string | null): Tracer.AnySpan | undefined => {
  const m = header?.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/)
  return m ? Tracer.externalSpan({ traceId: m[1]!, spanId: m[2]!, sampled: true }) : undefined
}

export const traceparentOf = (span: Tracer.AnySpan) => `00-${span.traceId}-${span.spanId}-01`

export type FlushMode = "inline" | "waitUntil" | "none"

/** Effect that sleeps via a real timer, standing in for work. */
export const work = (ms: number) => Effect.sleep(`${ms} millis`)
