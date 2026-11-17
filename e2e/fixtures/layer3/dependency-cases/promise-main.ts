// Named test process entry: actual generated public service, actual HTTP, actual Busy, no provider substitution.
import { Cause, Effect, Exit, Fiber, Layer } from "effect";
import { Busy, BusyLive } from "@architect/target-effect";
import { Pricing, layer } from "../../generated/dependencies/pricing.ts";
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts";

const origin = process.argv[2]!;
const state = () => fetch(`${origin}/state`, { headers: { connection: "close" } }).then((r) => r.json()) as Promise<{ held: number }>;
const release = () => fetch(`${origin}/release`, { headers: { connection: "close" } }).then((r) => r.text());
const program = Effect.gen(function* () {
  const pricing = yield* Pricing;
  const busy = yield* Busy;
  const answers = [];
  for (const mode of ["ok", "reject", "throw"] as const) {
    const exit = yield* Effect.exit(pricing.quote(origin, mode));
    const failure = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : undefined;
    answers.push({ mode, success: Exit.isSuccess(exit), value: Exit.isSuccess(exit) ? exit.value : undefined, selected: failure?._tag === "Some" && failure.value instanceof PriceUnavailable,
      defect: Exit.isFailure(exit) && Cause.hasDies(exit.cause) });
  }
  const work = yield* Effect.forkChild(pricing.quote(origin, "hold"));
  yield* Effect.promise(() => fetch(`${origin}/wait-held`, { headers: { connection: "close" } }).then((r) => r.text()));
  const stopping = yield* Effect.forkChild(Fiber.interrupt(work));
  yield* Effect.yieldNow;
  const held = yield* Effect.promise(state);
  const protectedWhileHeld = (yield* busy.count) > 0 && held.held === 1 && work.pollUnsafe() === undefined;
  yield* Effect.promise(release);
  const stopped = yield* Fiber.await(work);
  yield* Fiber.await(stopping);
  yield* busy.quiet;
  return { answers, protectedWhileHeld, interrupted: Exit.isFailure(stopped) && Cause.hasInterrupts(stopped.cause), finalCount: yield* busy.count };
}).pipe(Effect.provide(layer.pipe(Layer.provideMerge(BusyLive))));
console.log("DEPENDENCY_RESULT " + JSON.stringify(await Effect.runPromise(program)));
