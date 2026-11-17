// Scaffolded from blueprint/things/mission/verbs/resume.ts. Yours from now on.
import { Effect } from "effect";
import type { Handler } from "../../generated/api/src/mission/resume.handler.ts";

const resume: Handler = (_payload, { steps, move }) =>
  Effect.gen(function* () {
    yield* steps.record(Effect.void);
    yield* move("running");
    return {};
  });

export default resume;
