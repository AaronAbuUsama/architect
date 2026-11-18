// Planted fixture: the real spend handler, made slow by real work. Before its normal work it runs COUNT sequential
// queries through the handler's SqlClient (D1). No wall clock, no Timers: handlers cannot reach Timers before layer 5.
// Install over src/allowance/spend.ts.
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { Records } from "@architect/target-effect";
import type { Handler } from "../../generated/api/src/allowance/spend.handler.ts";
import { Allowance } from "../../blueprint/things/allowance/thing.ts";
import { AllowanceExceeded } from "../../blueprint/things/allowance/errors.ts";

const COUNT = 2000;

/** Spend from what is left of this month's allowance. */
const spend: Handler = ({ allowance, amount }, { steps, move }) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    for (let i = 0; i < COUNT; i++) yield* sql`select 1`.pipe(Effect.orDie);
    const records = yield* Records;
    // Only the allowance's grantee may spend, so the runtime has already found it before this runs.
    const found = yield* steps.load(records.find(Allowance, allowance));
    if (!found) return yield* Effect.die(new Error(`allowance ${allowance} was checked and then not found`));
    const limit = found["limit"] as bigint;
    const spent = found["spent"] as bigint;
    const remaining = limit - spent;
    if (amount > remaining) {
      yield* Effect.logInfo("the amount is more than is left").pipe(Effect.annotateLogs({ amount: String(amount), remaining: String(remaining) }));
      return yield* new AllowanceExceeded({ remaining });
    }
    yield* steps.record(records.update(Allowance, allowance, { spent: spent + amount }));
    yield* move(amount === remaining ? "exhausted" : "active");
    return { remaining: remaining - amount };
  });

export default spend;
