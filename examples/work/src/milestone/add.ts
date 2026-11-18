// Scaffolded from blueprint/things/milestone/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/milestone/add.handler.ts";

/** Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. */
const add: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, title, kinds, of, until.
    // Answer: milestone.
    // Steps, each its own span: steps.insert(...).
    return yield* Handlers.blank("this handler is not written yet");
  });

export default add;
