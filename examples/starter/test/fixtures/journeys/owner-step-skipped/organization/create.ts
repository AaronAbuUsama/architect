// Planted fixture: founds the organisation but never runs the declared `owner` step.
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import { Ids, Records } from "@formants/language-effect";
import type { Handler } from "../../generated/api/src/organization/create.handler.ts";
import { Organization } from "../../blueprint/things/organization/thing.ts";

const create: Handler<Records | SqlClient.SqlClient> = ({ name }, { principal, steps, move }) =>
  Effect.gen(function* () {
    // Only the signed in may call, so the caller is a person.
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const organization = yield* Ids.of(Organization.fields.id);
    yield* steps.insert(records.insert(Organization, { id: organization, name, owner: principal.person as never }));
    // BREAK: steps.owner (the founder's owner membership) is never run, so no `organization.create.owner` span.
    yield* move("active");
    return { organization };
  });

export default create;
