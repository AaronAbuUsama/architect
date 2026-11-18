// Scaffolded from blueprint/things/handle/verbs/resolve.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/handle/resolve.handler.ts";
import { Handle } from "../../blueprint/things/handle/thing.ts";
import { HandleNotFound } from "../../blueprint/things/handle/errors.ts";
import { find, handleId } from "../modules/page/internal/records.ts";

const resolve: Handler = ({ name }, { steps }) =>
  Effect.gen(function* () {
    const handle = yield* handleId(name);
    const named = yield* steps.load(find(Handle, handle));
    if (named?.state !== "claimed") {
      yield* Effect.logInfo("the name has no active claim");
      return yield* new HandleNotFound({});
    }
    return { handle };
  });

export default resolve;
