// Scaffolded from blueprint/things/allowance/verbs/grant.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../../generated/api/src/allowance/grant.handler.ts";

/** Let a member spend from the organisation, up to a limit each month. */
const grant: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: organization, member, limit.
    // Answer: allowance.
    // Steps, each its own span: steps.insert(...).
    // May refuse with AllowanceLimitTooHigh.
    return yield* Handlers.blank("this handler is not written yet");
  });

export default grant;
