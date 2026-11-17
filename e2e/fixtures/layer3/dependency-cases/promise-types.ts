import { Effect, type Types } from "effect";
import type { quote as foreignQuote } from "@fixture/remote";
import { Pricing } from "../../generated/dependencies/pricing.ts";
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts";
// Inspect the actual inferred channels. An annotation here would hide a lost selected error (notably never).
const call = Effect.flatMap(Pricing, (pricing) => pricing.quote("http://127.0.0.1:19175", "ok"));
type NativeReply = Awaited<ReturnType<typeof foreignQuote>>;
// Readonly and a more precise error tag are legitimate refinements; erased/any/never channels are not.
type Concrete<T> = 0 extends (1 & T) ? false : [T] extends [never] ? false : true;
type Observable<T, Expected> = { -readonly [K in keyof T]: K extends "_tag" ? K extends keyof Expected ? Expected[K] : T[K] : T[K] };
type ChannelMatches<T, Expected> = Concrete<T> extends true ? Types.Equals<Observable<T, Expected>, Observable<Expected, Expected>> : false;
const inferredChannels: {
  reply: ChannelMatches<Effect.Success<typeof call>, NativeReply>;
  failure: ChannelMatches<Effect.Error<typeof call>, PriceUnavailable>;
} = { reply: true, failure: true };
void inferredChannels;
Effect.map(call, (reply) => {
  const text: string = reply.value;
  // @ts-expect-error not part of the selected library's reply
  void reply.notInLibraryReply;
  return text;
});
Effect.flatMap(Pricing, (pricing) => {
  // @ts-expect-error imported callable requires a string origin
  pricing.quote(7, "ok");
  // @ts-expect-error not an imported callable mode
  pricing.quote("http://127.0.0.1:19175", "not-a-mode");
  return Effect.void;
});
Effect.mapError(call, (failure) => {
  const selected: PriceUnavailable = failure;
  // @ts-expect-error not a selected project error field
  void failure.foreignUnknownField;
  return selected;
});
