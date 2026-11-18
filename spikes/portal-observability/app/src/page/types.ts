// What an operation page shows: every value here comes from the model or from the telemetry query, never typed by hand.

export type Outcome = "answered" | "refused" | "defect";

export interface FieldRow {
  readonly name: string;
  readonly type: string;
  readonly named?: string;
  readonly ref?: string;
  readonly visibility: "public" | "private" | "secret";
  /** Written as a span attribute today: public fields are (L2.P). O2 turns free text off unless it is marked. */
  readonly traced: boolean;
  /** O2 will stop tracing this one (public free text). */
  readonly untracedByO2: boolean;
}

export interface RefusalRow {
  readonly tag: string;
  readonly code: string;
  readonly exit?: number;
  /** Where it comes from: the operation's own `errors`, the machine's `notFrom`, or the role check. */
  readonly from: "declared" | "machine" | "access";
  readonly fields: ReadonlyArray<FieldRow>;
  readonly count: number;
  readonly lastLog?: string;
  readonly lastTrace?: string;
  /** NotAllowed is decided before the operation's span opens, so only the HTTP span says it happened (O2 gap 3). */
  readonly seenOnlyAtTheDoor: boolean;
}

export interface StepRow {
  readonly key: string;
  readonly span: string;
  readonly kind: string;
  readonly calls: number;
  readonly p95: number | undefined;
  /** Declared by O2, not yet emitted. */
  readonly planned: boolean;
}

export interface Call {
  readonly trace: string;
  readonly start: number;
  /** The operation's span when there is one, else the HTTP span (a call refused at the door). */
  readonly ms: number;
  readonly outcome: Outcome;
  readonly tag?: string;
  readonly log?: string;
  readonly defect?: string;
  readonly http?: number;
  readonly principal?: string;
  readonly payload: Readonly<Record<string, string>>;
  readonly answer: Readonly<Record<string, string>>;
  readonly replayed: boolean;
  /** The journey that made it, when prove did. */
  readonly journey?: string;
  readonly overBudget: boolean;
}

export interface Bucket {
  readonly t: number;
  readonly answered: number;
  readonly refused: number;
  readonly defects: number;
  readonly p95: number | undefined;
}

export interface Live {
  readonly source: string;
  readonly now: number;
  readonly since: number;
  readonly calls: ReadonlyArray<Call>;
  readonly total: number;
  readonly answered: number;
  readonly refused: number;
  readonly defects: number;
  readonly p50: number | undefined;
  readonly p95: number | undefined;
  readonly series: ReadonlyArray<Bucket>;
}

export interface OperationPage {
  readonly name: string;
  readonly thing: string;
  readonly verb: string;
  readonly description: string;
  readonly declaration: string;
  readonly handler: string;
  readonly hash: string;
  readonly budgetMs: number | undefined;
  readonly idempotent?: string;
  readonly roles: ReadonlyArray<string>;
  readonly waysIn: ReadonlyArray<{ readonly kind: string; readonly text: string }>;
  readonly payload: ReadonlyArray<FieldRow>;
  readonly answer: ReadonlyArray<FieldRow>;
  readonly move?: { readonly key: string; readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly states: ReadonlyArray<string> };
  readonly event?: { readonly name: string; readonly fields: ReadonlyArray<FieldRow>; readonly emitted: number };
  readonly refusals: ReadonlyArray<RefusalRow>;
  readonly steps: ReadonlyArray<StepRow>;
  readonly journeys: ReadonlyArray<{ readonly name: string; readonly file: string; readonly calls: number }>;
  readonly live: Live;
}

export interface SpanRow {
  readonly id: string;
  readonly parent: string;
  readonly name: string;
  readonly depth: number;
  readonly offset: number;
  readonly ms: number;
  readonly role: "caller" | "http" | "operation" | "step" | "store" | "other";
  readonly status: "ok" | "refusal" | "error";
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly children: ReadonlyArray<SpanRow>;
}

export interface TraceView {
  readonly trace: string;
  readonly total: number;
  readonly roots: ReadonlyArray<SpanRow>;
  readonly logs: ReadonlyArray<{ readonly span: string; readonly spanName: string; readonly body: string; readonly attrs: Readonly<Record<string, unknown>> }>;
}
