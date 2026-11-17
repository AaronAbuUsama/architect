// The nine evals: what every call in every journey must show, judged from telemetry and the world's facts against
// the model. Eval 7 (performance) only ever raises a review; every other failure fails `prove`.
import type { OperationModel } from "@architect/compiler";
import type { CallRecord, Project } from "#modules/journeys/types.js";
import type { Span, Trace } from "#modules/telemetry/types.js";

/** One call and everything known about it. */
export interface Evidence {
  readonly call: CallRecord;
  readonly trace: Trace;
  /** The operation's own span, if it opened (a refused caller never opens it). */
  readonly opSpan: Span | undefined;
  /** The refusal's name: from the answer, or from the operation's span when the server died sending it. */
  readonly refusal: string | undefined;
  /** The stored state of the instance the call moved, read right after the call. */
  readonly stored: string | undefined;
}

export interface Verdict {
  /** `answer shape`, `declared errors`, …: the eval's name as reports print it. */
  readonly eval: string;
  readonly operation: string | undefined;
  readonly failures: ReadonlyArray<string>;
  /** Lines that inform without failing: performance numbers, reviews, coverage counts. */
  readonly notes: ReadonlyArray<string>;
}

/** One eval of one operation: its own calls' evidence, and the whole run's, for the evals that look wider (coverage). */
export type PerOperation = (op: OperationModel, evidence: ReadonlyArray<Evidence>, run: { readonly project: Project; readonly all: ReadonlyArray<Evidence> }) => Verdict;

export interface EvalsApi {
  /** How a failure names the call it is about: `grant-an-allowance "ada grants olga 500"`. Every failure line starts with it. */
  readonly where: (call: CallRecord) => string;
  /** Every eval over every operation, then coverage over the whole run. */
  readonly judge: (project: Project, evidence: ReadonlyArray<Evidence>) => ReadonlyArray<Verdict>;
  /** The evidence for each call: its spans, its refusal and, for a move, the stored state of what moved, from the call record. */
  readonly gather: (calls: ReadonlyArray<CallRecord>, traces: ReadonlyMap<string, Trace>) => ReadonlyArray<Evidence>;
}
