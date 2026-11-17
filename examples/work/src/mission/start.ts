// Scaffolded from blueprint/things/mission/verbs/start.ts. Yours from now on.
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { MissionHasOpenQuestions } from "../../blueprint/things/mission/errors.ts";
import type { Handler } from "../../generated/api/src/mission/start.handler.ts";

/** Start once every intake question is answered or spiked. */
const start: Handler = ({ mission }, { steps, move }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const rows = yield* steps.record(sql.unsafe<{ n: number }>(`SELECT count(*) AS n FROM question WHERE mission = ? AND state = 'asked'`, [mission]).pipe(Effect.orDie));
    const open = Number(rows[0]?.n ?? 0);
    if (open > 0) return yield* new MissionHasOpenQuestions({ open: BigInt(open) });
    yield* move("running");
    return {};
  });

export default start;
