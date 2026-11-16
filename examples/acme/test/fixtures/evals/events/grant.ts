// Planted fixture: writes the allowance row directly, never going through the machine's grant move, so no
// AllowanceGranted event is recorded.
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/allowance/grant.handler.ts";

const grant: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    const allowance = yield* steps.insert(Effect.succeed("alw_planted1")); // raw insert, state set by hand, no move
    return { allowance } as never;
  });

export default grant;
