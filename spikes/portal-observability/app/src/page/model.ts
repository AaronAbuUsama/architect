// The parts of `generated/model/model.json` this page reads, and the telemetry it is given. Nothing else goes in.

export interface Value {
  readonly type: string;
  readonly prefix?: string;
  readonly bits?: number;
  readonly max?: number;
}

export interface Field {
  readonly value: Value;
  readonly named?: string;
  readonly ref?: string;
  /** Absent means public (the compiler writes it only when it isn't). */
  readonly visibility?: "public" | "private" | "secret";
}

export type Fields = Readonly<Record<string, Field>>;

export interface Allowed {
  readonly kind: string;
  readonly role?: string;
  readonly path?: string;
}

export interface Operation {
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly file: string;
  readonly description: string;
  readonly payload: Fields;
  readonly answer: Fields;
  readonly move?: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string };
  readonly errors: ReadonlyArray<string>;
  readonly refusals: ReadonlyArray<string>;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly steps: Readonly<Record<string, { readonly name: string; readonly type: string }>>;
  readonly idempotent?: string;
  readonly runs?: string;
  readonly budget?: { readonly p95Ms: number };
  readonly hash: string;
}

export interface Thing {
  readonly name: string;
  readonly description?: string;
  readonly code: string;
  readonly fields: Fields;
  readonly machine?: {
    readonly states: ReadonlyArray<string>;
    readonly moves: Readonly<Record<string, { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string }>>;
    readonly notFrom?: { readonly error: string; readonly exit: number; readonly code: string };
  };
  readonly events?: Readonly<Record<string, Fields>>;
  readonly errors?: Readonly<Record<string, { readonly fields: Fields; readonly exit: number; readonly code: string }>>;
}

export interface Model {
  readonly things: Readonly<Record<string, Thing>>;
  readonly operations: Readonly<Record<string, Operation>>;
  readonly refusals: Readonly<Record<string, string>>;
}

/** The same shape as `@formants/prove`'s `Trace`: what every `TraceSource` (files, Tempo, Axiom) answers. */
export interface Span {
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

/** The telemetry query's answer: every trace with a span in the window, by id, and the window itself. */
export interface Telemetry {
  readonly source: string;
  readonly now: number;
  readonly since: number;
  readonly traces: Readonly<Record<string, Trace>>;
}

/** Journeys are not in the model yet (the portal's `extensions.journeys` says so); the server lists their files. */
export interface JourneyRef {
  readonly name: string;
  readonly file: string;
  readonly operations: ReadonlyArray<string>;
}
