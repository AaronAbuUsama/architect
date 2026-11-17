// Fixture delegation only: no successful kit business handler is reimplemented here.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/probe/quote.handler.ts";
import { Pricing } from "../../generated/dependencies/pricing.ts";
const handler: Handler = (payload) => Effect.flatMap(Pricing, (pricing) => pricing.quote(payload.origin, payload.mode));
export default handler;
