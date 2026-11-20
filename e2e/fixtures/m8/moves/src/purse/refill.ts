// Scaffolded from blueprint/things/purse/verbs/refill.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/purse/refill.handler.ts";
import { Purse } from "../../blueprint/things/purse/thing.ts";

/** A new month: nothing spent, one period on. */
const refill: Handler = ({ purse }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const found = yield* steps.load(records.find(Purse, purse));
    if (!found) return yield* Effect.die(new Error(`purse ${purse} was checked and then not found`));
    const period = (found["period"] as bigint) + 1n;
    yield* steps.record(records.update(Purse, purse, { spent: 0n, period }));
    yield* move("active");
    return { period };
  });

export default refill;
