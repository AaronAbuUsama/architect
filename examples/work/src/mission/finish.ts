// Scaffolded from blueprint/things/mission/verbs/finish.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@architect/target-effect";
import { Mission } from "../../blueprint/things/mission/thing.ts";
import { MissionHasOpenTasks } from "../../blueprint/things/mission/errors.ts";
import { board } from "../board.ts";
import type { Handler } from "../../generated/api/src/mission/finish.handler.ts";

/** Finish only when every task is proven or done. */
const finish: Handler = ({ mission }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* records.find(Mission, mission);
    const tasks = yield* steps.record(board(mission, String(found?.["target"] ?? "test")));
    const open = tasks.filter((t) => t.column !== "done").length;
    if (open > 0) return yield* new MissionHasOpenTasks({ open: BigInt(open) });
    yield* move("done");
    return {};
  });

export default finish;
