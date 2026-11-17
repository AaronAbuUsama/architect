// Compile-time boundary: the generated service must not erase the foreign Effect's required Context.
import { Effect, Layer } from "effect";
import { BusyLive } from "@architect/target-effect";
import { RequiredSetting } from "@fixture/effect-remote";
import { Pricing, layer } from "../../generated/dependencies/pricing.ts";
const unresolved = Effect.flatMap(Pricing, (pricing) => pricing.quote("ok")).pipe(Effect.provide(layer.pipe(Layer.provideMerge(BusyLive))));
// @ts-expect-error the selected library's required setting is still missing
Effect.runPromise(unresolved);
Effect.runPromise(unresolved.pipe(Effect.provide(Layer.succeed(RequiredSetting, { value: "provided" }))));
