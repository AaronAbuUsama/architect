import { Clock, Deferred, Duration, Effect, Layer, Option } from "effect";
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
    const remove = (id: number) => {
      const pending = table.findIndex((timer) => timer.id === id);
      if (pending === -1) return false;
      table.splice(pending, 1);
      return true;
    };
    return Timers.of({
      at: (at, owner, name, work) => add(at, owner, name, busy.spawn(Effect.ignore(work))),
      sleep: (owner, span) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const woken = yield* Deferred.make<void>();
          // The timer takes a token for the sleeper before waking it, so a woken fiber is never uncounted.
          const id = yield* add(now + Duration.toMillis(span), owner, "sleep", Effect.andThen(busy.enter, Deferred.succeed(woken, undefined)));
          yield* busy.leave;
          yield* restore(Deferred.await(woken)).pipe(Effect.onInterrupt(() => Effect.gen(function* () {
            if (remove(id)) yield* busy.enter;
            // A firing timer has already claimed ownership of the wakeup.
            else yield* Deferred.await(woken);
          })));
        })),
      within: (owner, span, wait) =>
        Effect.uninterruptibleMask((restore) => Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;
          const ended = yield* Deferred.make<void>();
          const counted = yield* Deferred.make<void>();
          let claimed = false;
          const resume = Effect.suspend(() => {
            if (claimed) return Deferred.await(counted);
            claimed = true;
            return busy.enter.pipe(Effect.andThen(Deferred.succeed(counted, undefined)), Effect.asVoid);
          });
          const id = yield* add(now + Duration.toMillis(span), owner, "deadline", Effect.andThen(resume, Deferred.succeed(ended, undefined)));
          // Publish the deadline before releasing our work token so the world can advance it.
          yield* busy.leave;
          return yield* restore(Effect.raceFirst(
            Effect.map(wait, Option.some),
            Deferred.await(ended).pipe(Effect.as(Option.none())),
          )).pipe(Effect.ensuring(Effect.sync(() => remove(id)).pipe(Effect.andThen(resume))));
        })),
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
