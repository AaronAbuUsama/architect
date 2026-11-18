import { Deferred, Effect, Fiber } from "effect";
import { describe, expect, it } from "vitest";
import { Busy } from "./types.ts";
import { BusyLive } from "./service.ts";

const run = <A, E>(e: Effect.Effect<A, E, Busy>) => Effect.runPromise(Effect.provide(e, BusyLive));

describe("Busy", () => {
  it("counts work while it runs, and after it fails", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const during = yield* busy.counted(busy.count);
      yield* busy.counted(Effect.fail("no")).pipe(Effect.ignore);
      expect([during, yield* busy.count]).toEqual([1, 0]);
    })));

  it("is quiet only once spawned work ends", () =>
    run(Effect.gen(function* () {
      const busy = yield* Busy;
      const gate = yield* Deferred.make<void>();
      yield* busy.spawn(Deferred.await(gate));
      const waiting = yield* Effect.forkChild(busy.quiet);
      expect(yield* busy.count).toBe(1);
      yield* Deferred.succeed(gate, undefined);
      yield* Fiber.join(waiting);
      expect(yield* busy.count).toBe(0);
    })));
});
