import { Effect } from "effect";
import { Pricing } from "../../generated/dependencies/pricing.ts";
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts";
const call: Effect.Effect<{ readonly value: string }, PriceUnavailable, Pricing> =
  Effect.flatMap(Pricing, (pricing) => pricing.quote("http://127.0.0.1:19175", "ok"));
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
