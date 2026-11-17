// Planted fixture: answers the wrong shape. The declared answer is { allowance: Allowance id }.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/allowance/grant.handler.ts";

const grant: Handler = (_payload, { steps }) =>
  Effect.gen(function* () {
    yield* steps.insert(Effect.void);
    return { allowance: 500 } as never; // a number, not "alw_..."
  });

export default grant;
