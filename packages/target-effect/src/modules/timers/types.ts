// Timers: the only way anything waits. Nothing reads the wall clock and nothing sleeps on its own; a world's clock
// (real, stepped or scaled) decides when each timer is due.
import { Context, type Duration, type Effect } from "effect";

export interface Timer {
  readonly id: number;
  /** Epoch milliseconds on the world's clock. */
  readonly at: number;
  readonly owner: string;
  readonly name: string;
}

export class Timers extends Context.Service<Timers, {
  /** Fire `work` at the instant `at`, as counted work. */
  readonly at: <E>(at: number, owner: string, name: string, work: Effect.Effect<void, E>) => Effect.Effect<number>;
  /** A durable sleep: park until the world fires it. Must be called from counted work. */
  readonly sleep: (owner: string, span: Duration.Input) => Effect.Effect<void>;
  /** The earliest instant a timer is due at or before `target`, if any. */
  readonly due: (target: number) => Effect.Effect<number | undefined>;
  /** Fire every timer due at exactly `at`, in the order they were set; returns what fired. */
  readonly fire: (at: number) => Effect.Effect<ReadonlyArray<Timer>>;
  readonly pending: Effect.Effect<ReadonlyArray<Timer>>;
}>()("@architect/target-effect/Timers") {}
