// Scaffolded from blueprint/things/question/verbs/answer.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/question/answer.handler.ts";

/** Answer a question with one of its letters. */
const answer: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, question, picked.
    // Answer: nothing.
    // Steps, each its own span: steps.record(...).
    // May refuse with QuestionNoSuchOption.
    return yield* Handlers.blank("this handler is not written yet");
  });

export default answer;
