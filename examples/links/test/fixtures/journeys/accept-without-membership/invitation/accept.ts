// Planted fixture: accepts the invitation but never creates the membership it answers with.
import { Effect } from "effect";
import type { SqlClient } from "effect/sql";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/invitation/accept.handler.ts";
import { Invitation } from "../../blueprint/things/invitation/thing.ts";
import { Membership } from "../../blueprint/things/membership/thing.ts";

const accept: Handler<Records | SqlClient.SqlClient> = ({ invitation }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // The role check already loaded this invitation, so it exists.
    const found = yield* records.find(Invitation, invitation);
    const organization = found?.["organization"] as never;
    const membership = yield* Ids.of(Membership.fields.id);
    // BREAK: the join step runs but inserts nothing; the answer names a membership that does not exist.
    yield* steps.join(Effect.void);
    yield* move("accepted");
    return { organization, membership };
  });

export default accept;
