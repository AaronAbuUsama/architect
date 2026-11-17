// Scaffolded from blueprint/things/mission/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import { Mission } from "../../blueprint/things/mission/thing.ts";
import type { Handler } from "../../generated/api/src/mission/open.handler.ts";

/** Open a mission; the owner is whoever signed in. */
const open: Handler = ({ title, target, blueprint }, { principal, steps, move }) =>
  Effect.gen(function* () {
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const mission = yield* Ids.of(Mission.fields.id);
    yield* steps.insert(records.insert(Mission, { id: mission, owner: principal.person as never, title, target, blueprint }));
    yield* move("intake");
    return { mission };
  });

export default open;
