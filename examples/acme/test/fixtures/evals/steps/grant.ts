// Planted fixture: never runs its declared step. grant declares steps.insert, so a span allowance.grant.insert is owed.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/allowance/grant.handler.ts";

const grant: Handler = (_payload, _context) => Effect.succeed({ allowance: "alw_planted1" } as never); // steps.insert never called

export default grant;
