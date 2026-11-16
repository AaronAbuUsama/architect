// Telemetry for prove: a real OpenTelemetry Collector in Docker, its file exporter read back by trace id
// (spikes/otlp-from-workerd). What a call did is read from here, never from what the server says about itself.
import { Data, type Effect, type Scope } from "effect";

export interface Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly ms: number;
}

export interface Log {
  readonly traceId: string;
  readonly spanId: string;
  readonly body: string;
  readonly attrs: Readonly<Record<string, unknown>>;
}

export interface Trace {
  readonly spans: ReadonlyArray<Span>;
  readonly logs: ReadonlyArray<Log>;
}

export class CollectorFailed extends Data.TaggedError("CollectorFailed")<{ readonly message: string }> {}

export interface Collector {
  /** The OTLP/HTTP base URL the Worker exports to. */
  readonly url: string;
  /**
   * Every span and log of these traces, once each is complete: its root span (the child of the caller's span) is
   * present, no span points at a parent that isn't, and nothing new has arrived for a quiet window. A trace still
   * incomplete after 10 s comes back as it is; the evals then name what is missing.
   */
  readonly traces: (wanted: ReadonlyArray<{ readonly trace: string; readonly parent: string }>) => Effect.Effect<ReadonlyMap<string, Trace>>;
}

export interface CollectorsApi {
  /** Start a collector in Docker writing to `dir`; removed when the scope closes. */
  readonly start: (dir: string) => Effect.Effect<Collector, CollectorFailed, Scope.Scope>;
}
