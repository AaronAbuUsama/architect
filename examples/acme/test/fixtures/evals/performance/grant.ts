// Planted fixture: the real grant handler, made slow by real work. Before its normal work it runs COUNT sequential
// queries through the handler's SqlClient (D1). No wall clock, no Timers: handlers cannot reach Timers before layer 5.
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { Ids, Records } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/allowance/grant.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";
import { AllowanceLimitTooHigh } from "../../blueprint/things/allowance/errors.ts";
import { Organization } from "../../blueprint/things/organization/thing.ts";

const COUNT = 2000;

/** Let a member spend from the organisation, up to a limit each month. */
const grant: Handler = ({ organization, member, limit }, { steps, move }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    for (let i = 0; i < COUNT; i++) yield* sql`select 1`.pipe(Effect.orDie);
    const records = yield* Records;
    // The role check already loaded this organisation, so it exists.
    const found = yield* records.find(Organization, organization);
    const cap = typeof found?.["cap"] === "bigint" ? found["cap"] : 0n;
    if (limit > cap) {
      yield* Effect.logInfo("the limit is over the organisation's cap").pipe(Effect.annotateLogs({ limit: String(limit), cap: String(cap) }));
      return yield* new AllowanceLimitTooHigh({ cap });
    }
    const allowance = yield* Ids.of(Allowance.fields.id);
    yield* steps.insert(records.insert(Allowance, { id: allowance, organization, member, limit, spent: 0n }));
    yield* move("active");
    return { allowance };
  });

export default grant;
