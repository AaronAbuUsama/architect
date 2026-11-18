// Scaffolded from blueprint/things/run/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { Handlers } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/run/start.handler.ts";

/** Start an agent on one task. The run claims the task until it ends. */
const start: Handler = (_payload, _context) =>
  Effect.gen(function* () {
    // Payload: mission, task, agent, model, budget.
    // Answer: run.
    // Steps, each its own span: steps.claim(...).
    // May refuse with RunOverBudget, RunAgentCannot, RunTaskClaimed.
    return yield* Handlers.blank("this handler is not written yet");
  });

export default start;
