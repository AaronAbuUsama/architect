// Scaffolded from blueprint/things/organization/verbs/create.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/organization/create.handler.ts";
import { Organization } from "../../blueprint/things/organization/thing.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

/** Found an organisation: whoever founds it owns it, and is its first member, as its owner. */
const create: Handler = ({ name }, { principal, steps, move }) =>
  Effect.gen(function* () {
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const organization = yield* Ids.of(Organization.fields.id);
    const owner = principal.person as never;
    yield* steps.insert(records.insert(Organization, { id: organization, name, owner }));
    const membership = yield* Ids.of(Membership.fields.id);
    yield* steps.owner(records.insert(Membership, { id: membership, organization, person: owner, role: "owner" }));
    yield* move("active");
    return { organization };
  });

export default create;
