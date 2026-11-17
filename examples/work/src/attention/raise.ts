// Scaffolded from blueprint/things/attention/verbs/raise.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import { Attention } from "../../blueprint/things/attention/thing.ts";
import { MissionNotRunning } from "../../blueprint/things/mission/errors.ts";
import { stateOf } from "../board.ts";
import type { Handler } from "../../generated/api/src/attention/raise.handler.ts";

const raise: Handler = ({ mission, kind, title, why, task }, { steps, move }) =>
  Effect.gen(function* () {
    if ((yield* stateOf("mission", mission)) !== "running") {
      yield* Effect.logInfo("the mission is not running");
      return yield* new MissionNotRunning({});
    }
    const records = yield* Records;
    const attention = yield* Ids.of(Attention.fields.id);
    yield* steps.insert(records.insert(Attention, { id: attention, mission, kind, title, why, task }));
    yield* move("open");
    return { attention };
  });

export default raise;
