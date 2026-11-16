// Planted lint fixture: refuses with AllowanceExceeded and no Effect.log* before it, so nothing says why.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/allowance/spend.handler.ts";
import { AllowanceExceeded } from "../../../blueprint/things/allowance/errors.ts";

const spend: Handler = (payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.load(Effect.void);
    if (payload.amount > 380n) return yield* new AllowanceExceeded({ remaining: 380n }); // PLANTED: no Effect.log* before the refusal
    return yield* steps.record(Effect.succeed({ remaining: 380n - payload.amount }));
  });

export default spend;
