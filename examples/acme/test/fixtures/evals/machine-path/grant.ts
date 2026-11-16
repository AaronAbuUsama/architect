// Planted fixture: moves the allowance to "paused", a state the machine does not declare (it declares only "active").
import { Effect } from "effect";
import type { Handler } from "../../../generated/api/src/allowance/grant.handler.ts";

const grant: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    const allowance = yield* steps.insert(Effect.succeed("alw_planted1"));
    yield* move("paused" as never); // the runtime's outcome check is what the eval must not rely on
    return { allowance } as never;
  });

export default grant;
