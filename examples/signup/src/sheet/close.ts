// Scaffolded from blueprint/things/sheet/verbs/close.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/sheet/close.handler.ts";

/** Take a sheet down. Nobody can join it after this. The machine's check already passed. */
const close: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(move("closed"));
    return {};
  });

export default close;
