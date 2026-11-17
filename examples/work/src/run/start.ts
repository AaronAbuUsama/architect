// Scaffolded from blueprint/things/run/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { Ids, Records } from "@architect/target-effect";
import { Run } from "../../blueprint/things/run/thing.ts";
import { RunTaskClaimed } from "../../blueprint/things/run/errors.ts";
import { MissionNotRunning } from "../../blueprint/things/mission/errors.ts";
import { stateOf } from "../board.ts";
import type { Handler } from "../../generated/api/src/run/start.handler.ts";

/** Claim a task for one agent. One live run per task; only while the mission runs. */
const start: Handler = ({ mission, task, agent, model, budget }, { steps, move }) =>
  Effect.gen(function* () {
    if ((yield* stateOf("mission", mission)) !== "running") {
      yield* Effect.logInfo("the mission is not running");
      return yield* new MissionNotRunning({});
    }
    const sql = yield* SqlClient.SqlClient;
    const live = yield* sql.unsafe<{ n: number }>(`SELECT count(*) AS n FROM run WHERE task = ? AND state IN ('running','waiting')`, [task]).pipe(Effect.orDie);
    if (Number(live[0]?.n ?? 0) > 0) {
      yield* Effect.logInfo("a live run already claims the task");
      return yield* new RunTaskClaimed({});
    }
    const records = yield* Records;
    const run = yield* Ids.of(Run.fields.id);
    yield* steps.claim(records.insert(Run, { id: run, mission, task, agent, model, budget }));
    yield* move("running");
    return { run };
  });

export default start;
