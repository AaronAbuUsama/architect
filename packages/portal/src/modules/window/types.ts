// The window module: what the portal reads of an environment's telemetry for the page it is drawing, and what it derives from it.
// Everything is read through `source.window(windowMs, now)` and `metrics.window(windowMs, now)`: the portal never reads a clock, so a
// page at a fixed `now` is the same bytes every time. Structural on purpose, as `LiveSource` is: `prove`'s `TraceSource` fits.
import type { Effect } from "effect";

/** A span as the window joins it: only what the portal shows or counts. */
export interface WindowSpan {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  /** 0 unset, 1 ok, 2 error. */
  readonly status: number;
  readonly ms: number;
  readonly start: number;
}

/** A log of a trace, read only to be counted: its body is never carried further. */
export interface WindowLog {
  readonly spanId: string;
}

export interface WindowTrace {
  readonly spans: ReadonlyArray<WindowSpan>;
  readonly logs: ReadonlyArray<WindowLog>;
}

/** A source that could not be read (`SourceFailed` in `prove`). */
export interface WindowFailure {
  readonly _tag: string;
  readonly message: string;
}

export interface WindowSource {
  readonly find: (trace: string) => Effect.Effect<WindowTrace | undefined>;
  readonly window: (since: number, now?: number) => Effect.Effect<ReadonlyMap<string, WindowTrace>, WindowFailure>;
}

/** One point of a metric in the window: `ortho.calls` carries `operation`, `outcome` and, when refused, `refusal`. */
export interface MetricPoint {
  readonly name: string;
  readonly labels: Readonly<Record<string, string>>;
  readonly value: number;
}

export interface WindowMetrics {
  readonly window: (since: number, now?: number) => Effect.Effect<ReadonlyArray<MetricPoint>, WindowFailure>;
}

/** What a page is drawn at: the environment, the two reads, the moment (`now`, never the clock's) and how far back. */
export interface LiveContext {
  readonly environment: string;
  readonly source: WindowSource;
  readonly metrics: WindowMetrics;
  readonly now: number;
  readonly windowMs: number;
}

/** Calls in the window, from `ortho.calls`: one per call, however many attempts it took, door refusals included. */
export interface CallStat {
  readonly calls: number;
  readonly answered: number;
  readonly refused: number;
  readonly defects: number;
}

export type CallerKind = "person" | "agent" | "anyone";
export type Outcome = "answered" | "refused" | "defect";

/** One call, as the rail lists it: one row per trace, a retry is one row of several attempts. */
export interface LastCall {
  readonly trace: string;
  readonly operation: string;
  readonly outcome: Outcome;
  readonly callerKind: CallerKind;
  readonly attempts: number;
  readonly start: number;
}

/** A journey's run seen in the window: its steps, each the operation it called and what came of it. */
export interface JourneyStep {
  readonly title: string;
  readonly operation: string;
  readonly outcome: Outcome;
}
export interface JourneyRun {
  readonly journey: string;
  readonly trace: string;
  readonly caller: CallerKind;
  readonly steps: ReadonlyArray<JourneyStep>;
}

export interface WindowView {
  readonly environment: string;
  readonly windowMs: number;
  readonly byOperation: Readonly<Record<string, CallStat>>;
  /** Newest first. */
  readonly lastCalls: ReadonlyArray<LastCall>;
  /** Answered moves in the window, by `<thing>.<move>`. */
  readonly moves: Readonly<Record<string, number>>;
  /** The journeys whose runs called each operation. */
  readonly journeysOf: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Refused calls by the declared refusal's name, from `ortho.calls`. */
  readonly refusals: Readonly<Record<string, number>>;
  /** Committed events by name, from the commit spans' `event.name`. */
  readonly events: Readonly<Record<string, number>>;
  readonly journeyRuns: ReadonlyArray<JourneyRun>;
}

export interface WindowApi {
  /** Read the window for a model's operations and fold it into the view. `undefined` operations are those the model does not declare. */
  readonly read: (live: LiveContext, thingOf: (operation: string) => string | undefined) => Effect.Effect<WindowView, WindowFailure>;
}
