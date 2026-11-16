import { Clock, Deferred, Duration, Effect, Layer } from "effect";
import { Busy } from "#modules/work/types.js";
import { Timers, type Timer } from "./types.ts";

const timerOf = (t: Timer): Timer => ({ id: t.id, at: t.at, owner: t.owner, name: t.name });

/** Timers kept in memory, fired by whoever drives the world's clock. A world's Durable Object keeps them in its table. */
export const TimersMemory = Layer.effect(
  Timers,
  Effect.gen(function* () {
    const busy = yield* Busy;
    const table: Array<Timer & { readonly run: Effect.Effect<void> }> = [];
    let next = 1;
    const add = (at: number, owner: string, name: string, run: Effect.Effect<void>) =>
      Effect.sync(() => {
        const id = next++;
        table.push({ id, at, owner, name, run });
        return id;
      });
    return Timers.of({
      at: (at, owner, name, work) => add(at, owner, name, busy.spawn(Effect.ignore(work))),
      sleep: (owner, span) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const woken = yield* Deferred.make<void>();
          // The timer takes a token for the sleeper before waking it, so a woken fiber is never uncounted.
          yield* add(now + Duration.toMillis(span), owner, "sleep", Effect.andThen(busy.enter, Deferred.succeed(woken, undefined)));
          yield* busy.leave;
          yield* Deferred.await(woken);
        }),
      due: (target) =>
        Effect.sync(() => table.reduce<number | undefined>((best, t) => (t.at <= target && (best === undefined || t.at < best) ? t.at : best), undefined)),
      fire: (at) =>
        Effect.gen(function* () {
          const hit = table.filter((t) => t.at === at).sort((a, b) => a.id - b.id);
          for (const t of hit) table.splice(table.indexOf(t), 1);
          yield* Effect.forEach(hit, (t) => t.run, { discard: true });
          return hit.map(timerOf);
        }),
      pending: Effect.sync(() => table.map(timerOf).sort((a, b) => a.at - b.at)),
    });
  }),
);
