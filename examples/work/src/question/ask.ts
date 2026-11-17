// Scaffolded from blueprint/things/question/verbs/ask.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import { Question } from "../../blueprint/things/question/thing.ts";
import { MissionNotInIntake } from "../../blueprint/things/mission/errors.ts";
import { stateOf } from "../board.ts";
import type { Handler } from "../../generated/api/src/question/ask.handler.ts";

const ask: Handler = ({ mission, asks, about, gap, options }, { steps, move }) =>
  Effect.gen(function* () {
    if ((yield* stateOf("mission", mission)) !== "intake") {
      yield* Effect.logInfo("the mission is past intake");
      return yield* new MissionNotInIntake({});
    }
    const records = yield* Records;
    const question = yield* Ids.of(Question.fields.id);
    yield* steps.insert(records.insert(Question, { id: question, mission, asks, about, gap, options }));
    yield* move("asked");
    return { question };
  });

export default ask;
