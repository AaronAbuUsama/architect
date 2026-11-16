// Counted work: how a world knows it is quiet. Every handler, workflow and keeper job holds a token while it runs.
import { Context, type Effect } from "effect";

export class Busy extends Context.Service<Busy, {
  /** Run `work` as the world's work: counted from start until it ends, however it ends. */
  readonly counted: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Start `work` in the background as the world's work, counted from now. */
  readonly spawn: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<void, never, R>;
  /** Take a token without running anything: a timer takes one for the sleeper it is about to wake. */
  readonly enter: Effect.Effect<void>;
  /** Give a token back: a durable sleep gives its own back while it is parked. */
  readonly leave: Effect.Effect<void>;
  readonly count: Effect.Effect<number>;
  /** Wait until no work holds a token. */
  readonly quiet: Effect.Effect<void>;
}>()("@architect/target-effect/Busy") {}
