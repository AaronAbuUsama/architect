// Telemetry from a Worker: each request gets its own OTLP exporters, flushed after the response under `waitUntil`
// (spikes/otlp-from-workerd). Every response carries `x-trace-id`; a caller's `traceparent` is kept.
import type { Context } from "effect";

export type WebHandler = (request: Request, context?: Context.Context<never>) => Promise<Response>;

export interface TelemetryApi {
  readonly serve: (options: {
    /** The collector's OTLP/HTTP base URL. Unset: no export, but trace ids still flow. */
    readonly url: string | undefined;
    readonly service: string;
    readonly handler: WebHandler;
    readonly waitUntil: (promise: Promise<unknown>) => void;
  }, request: Request) => Promise<Response>;
}
