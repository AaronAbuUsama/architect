import { Cause, Effect, Exit, Layer } from "effect";
import { BusyLive } from "@architect/target-effect";
import { Pricing, layer } from "../../generated/dependencies/pricing.ts";
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts";
const exit = await Effect.runPromiseExit(Effect.flatMap(Pricing, (pricing) => pricing.quote(process.argv[2]!, "reject"))
  .pipe(Effect.provide(layer.pipe(Layer.provideMerge(BusyLive)))));
const failure = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : undefined;
console.log("DEPENDENCY_RESULT " + JSON.stringify({ defect: Exit.isFailure(exit) && Cause.hasDies(exit.cause), selected: failure?._tag === "Some" && failure.value instanceof PriceUnavailable }));
