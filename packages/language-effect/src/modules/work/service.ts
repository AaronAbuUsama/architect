import { Deferred, Effect, Layer } from "effect";
import { Busy } from "./types.ts";

/** Counted work inside one process. A world's Durable Object keeps the count across processes from stage five. */
export const BusyLive = Layer.sync(Busy, () => {
  let count = 0;
  let waiters: Array<Deferred.Deferred<void>> = [];
  const enter = Effect.sync(() => {
    count++;
  });
  const leave = Effect.suspend(() => {
    count--;
    if (count < 0) return Effect.die(new Error("Busy: a token was given back that was never taken"));
    if (count > 0) return Effect.void;
    const ready = waiters;
    waiters = [];
    return Effect.forEach(ready, (d) => Deferred.succeed(d, undefined), { discard: true });
  });
  const quiet = Effect.suspend(() => {
    if (count === 0) return Effect.void;
    const d = Deferred.makeUnsafe<void>();
    waiters.push(d);
    return Deferred.await(d);
  });
  return Busy.of({
    counted: (work) => Effect.andThen(enter, Effect.ensuring(work, leave)),
    spawn: (work) => Effect.andThen(enter, Effect.forkDetach(Effect.ensuring(work, leave))).pipe(Effect.asVoid),
    enter,
    leave,
    count: Effect.sync(() => count),
    quiet,
  });
});
