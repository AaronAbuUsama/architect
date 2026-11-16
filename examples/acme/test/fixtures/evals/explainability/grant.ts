// Planted fixture: refuses over the cap with AllowanceLimitTooHigh but logs nothing about why. The deciding fact
// (the limit and the cap) appears in no log and no span attribute.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/allowance/grant.handler.ts";
import { AllowanceLimitTooHigh } from "../../../blueprint/things/allowance/errors.ts";

const grant: Handler = (payload, { steps }) =>
  Effect.gen(function* () {
    if (payload.limit > 1000n) return yield* Effect.fail(new AllowanceLimitTooHigh({ cap: 1000n })); // no Effect.log
    const allowance = yield* steps.insert(Effect.succeed("alw_planted1"));
    return { allowance } as never;
  });

export default grant;
