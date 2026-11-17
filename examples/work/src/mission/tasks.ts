// Scaffolded from blueprint/things/mission/verbs/tasks.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@architect/target-effect";
import { Mission } from "../../blueprint/things/mission/thing.ts";
import { board } from "../board.ts";
import type { Handler } from "../../generated/api/src/mission/tasks.handler.ts";

/** The board: worked out now, from the milestones and the facts. */
const tasks: Handler = ({ mission }, { steps }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.plan(records.find(Mission, mission));
    const all = yield* steps.facts(board(mission, String(found?.["target"] ?? "test")));
    return { tasks: all };
  });

export default tasks;
