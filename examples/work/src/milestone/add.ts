// Scaffolded from blueprint/things/milestone/verbs/add.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import { Milestone } from "../../blueprint/things/milestone/thing.ts";
import { MissionClosed } from "../../blueprint/things/mission/errors.ts";
import { stateOf } from "../board.ts";
import type { Handler } from "../../generated/api/src/milestone/add.handler.ts";

const add: Handler = ({ mission, title, kinds, of, until }, { steps, move }) =>
  Effect.gen(function* () {
    const s = yield* stateOf("mission", mission);
    if (s === "done" || s === "stopped") {
      yield* Effect.logInfo("the mission is closed");
      return yield* new MissionClosed({});
    }
    const records = yield* Records;
    const milestone = yield* Ids.of(Milestone.fields.id);
    yield* steps.insert(records.insert(Milestone, { id: milestone, mission, title, kinds, of, until }));
    yield* move("active");
    return { milestone };
  });

export default add;
