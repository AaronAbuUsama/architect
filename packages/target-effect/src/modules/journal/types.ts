// The journal: every event a move emitted, committed with the move itself, with the trace of the call that made it.
import { Context, type Effect } from "effect";

export interface Entry {
  /** The trace of the call that made the move: how `prove` finds a step's events. */
  readonly trace: string;
  readonly operation: string;
  readonly move: string;
  /** The id of the instance that moved. */
  readonly subject: string;
  readonly event: string;
  /** The event's fields in wire form (text for ids and amounts). */
  readonly fields: { readonly [field: string]: unknown };
}

/** Reading the journal back. Entries are written only by `Store.commit`, with the move that emitted them. */
export class Journal extends Context.Service<Journal, {
  /** Every entry a trace wrote, in order. */
  readonly ofTrace: (trace: string) => Effect.Effect<ReadonlyArray<Entry>>;
}>()("@architect/target-effect/Journal") {}
