import { Effect } from "effect"

// Tiny replacement for @effect/vitest: run an Effect inside workerd, fail the test on any failure.
export const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> => Effect.runPromise(effect)
