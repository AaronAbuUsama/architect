// Scaffolded from blueprint/things/organization/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@architect/target-effect";
import type { Handler } from "../../../generated/api/src/organization/create.handler.ts";

/** Start an organisation. Whoever creates it owns it. */
const create: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: name, cap.
    // Answer: organization.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default create;
