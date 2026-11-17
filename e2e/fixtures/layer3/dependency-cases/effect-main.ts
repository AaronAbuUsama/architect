import { Cause, Effect, Exit, Layer } from "effect";
import { BusyLive } from "@architect/target-effect";
import { RequiredSetting } from "@fixture/effect-remote";
import { Pricing, layer } from "../../generated/dependencies/pricing.ts";
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts";
const program = Effect.gen(function* () {
  const pricing = yield* Pricing;
  const outcomes = [];
  for (const mode of ["ok", "fail", "defect", "interrupt"] as const) {
    const exit = yield* Effect.exit(pricing.quote(mode));
    const failure = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : undefined;
    outcomes.push({ mode, value: Exit.isSuccess(exit) ? exit.value : undefined,
      selected: failure?._tag === "Some" && failure.value instanceof PriceUnavailable,
      defect: Exit.isFailure(exit) && Cause.hasDies(exit.cause), interrupted: Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause) });
  }
  return outcomes;
}).pipe(Effect.provide(layer.pipe(Layer.provideMerge(BusyLive))), Effect.provide(Layer.succeed(RequiredSetting, { value: "configured-setting" })));
console.log("DEPENDENCY_RESULT " + JSON.stringify(await Effect.runPromise(program)));
