// Planted type fixture: spend returns a refusal it never declared. AllowanceLimitTooHigh belongs to grant; spend
// declares only AllowanceExceeded and AllowanceNotFound.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";
import { AllowanceLimitTooHigh } from "../../blueprint/things/allowance/errors.ts";

const spend: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.load(Effect.void);
    return yield* Effect.fail(new AllowanceLimitTooHigh({ cap: 1000n })); // not in spend's errors: tsc must reject this
  });

export default spend;
