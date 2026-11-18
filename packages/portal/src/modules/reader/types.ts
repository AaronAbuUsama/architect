// The portal's read access to the logbook: three reads, each a value or a named failure. Injected, so the snapshot never
// knows whether it is talking to the real logbook over HTTP or to a test's memory.
import { Data, type Effect } from "effect";

/** A verdict as the logbook stores it (its `GET /verdicts/latest` row): the seq that orders the ledger, and who posted it. */
export interface Verdict {
  readonly seq: number;
  readonly revision: string;
  readonly environment: string;
  readonly operation: string;
  readonly verdict: "pass" | "fail";
  readonly repository: string;
  readonly ref: string;
  readonly workflow: string;
  readonly event_name: string | null;
  readonly sha: string | null;
}

export interface Release {
  readonly seq: number;
  readonly version: string;
  readonly revision: string;
  readonly ref: string;
  readonly event_name: string | null;
}

/** The logbook did not answer, or answered something that is not what it says it answers. Never "no verdicts". */
export class LogbookUnavailable extends Data.TaggedError("LogbookUnavailable")<{ readonly reason: string }> {}
/** The logbook answered, and has no model for that revision. */
export class ModelMissing extends Data.TaggedError("ModelMissing")<{ readonly revision: string }> {}

export interface LogbookReader {
  /** The newest verdict of each operation in each environment among those posted from `ref`, failures included: nothing is filtered to passes first. */
  readonly latest: (ref: string) => Effect.Effect<ReadonlyArray<Verdict>, LogbookUnavailable>;
  /** The model the logbook holds for a revision, as JSON; not yet checked for a shape. */
  readonly model: (revision: string) => Effect.Effect<unknown, LogbookUnavailable | ModelMissing>;
  /** The last production release; null when there has been none. */
  readonly release: () => Effect.Effect<Release | null, LogbookUnavailable>;
}

export interface ReaderApi {
  /** The logbook's open reads at `url`, with a time limit on each. */
  readonly http: (url: string) => LogbookReader;
}
