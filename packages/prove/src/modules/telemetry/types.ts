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
  /** When it started, in milliseconds since the epoch: the order steps ran in. */
  readonly start: number;
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
  /**
   * Start a collector in Docker writing to `dir`; removed when the scope closes. `strip` are attribute keys its
   * `attributes` processor deletes from every span and log (L2.P): the keys the model says may carry a non-public value.
   */
  readonly start: (dir: string, options?: { readonly strip?: ReadonlyArray<string> }) => Effect.Effect<Collector, CollectorFailed, Scope.Scope>;
  /**
   * A collector that outlives this process, for an environment that has one of its own: a container `name` writing to
   * a fresh `dir`, on a port Docker picks. Returns its OTLP/HTTP URL. Whoever launches it stops it.
   */
  readonly launch: (options: { readonly dir: string; readonly name: string; readonly strip?: ReadonlyArray<string> }) => Effect.Effect<string, CollectorFailed>;
  /** Remove the container `name`. Nothing to remove is not an error. */
  readonly stop: (name: string) => Effect.Effect<void>;
  /** Read what some collector wrote to `dir`, by trace id. */
  readonly read: (dir: string) => Pick<Collector, "traces">;
}
