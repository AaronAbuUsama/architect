// Scaffolded from blueprint/things/allowance/verbs/grant.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import type { Handler } from "../../../generated/api/src/allowance/grant.handler.ts";
import { Allowance } from "../../../blueprint/things/allowance/thing.ts";
import { AllowanceLimitTooHigh } from "../../../blueprint/things/allowance/errors.ts";
import { Organization } from "../../../blueprint/things/organization/thing.ts";

/** Let a member spend from the organisation, up to a limit each month. */
const grant: Handler = ({ organization, member, limit }, { steps, move }) =>
  Effect.gen(function* () {
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
