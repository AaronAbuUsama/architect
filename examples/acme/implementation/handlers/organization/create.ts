// Scaffolded from blueprint/things/organization/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import type { Handler } from "../../../generated/api/src/organization/create.handler.ts";
import { Organization } from "../../../blueprint/things/organization/thing.ts";

/** Found an organisation; whoever founds it owns it. */
const create: Handler = ({ name, cap }, { principal, steps }) =>
  Effect.gen(function* () {
    // Only the signed in may call, so the caller is a person.
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const organization = yield* Ids.of(Organization.fields.id);
    yield* steps.insert(records.insert(Organization, { id: organization, name, owner: principal.person as never, cap }));
    return { organization };
  });

export default create;
