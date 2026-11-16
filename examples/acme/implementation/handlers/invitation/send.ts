// Scaffolded from blueprint/things/invitation/verbs/send.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@architect/target-effect";
import type { Handler } from "../../../generated/api/src/invitation/send.handler.ts";
import { Invitation } from "../../../blueprint/things/invitation/thing.ts";

/** Invite someone to an organisation by email. Only its owner gets this far. */
const send: Handler = ({ organization, email }, { principal, steps, move }) =>
  Effect.gen(function* () {
    if (principal.kind !== "person") return yield* Effect.die(new Error("reached without a signed-in person"));
    const records = yield* Records;
    const invitation = yield* Ids.of(Invitation.fields.id);
    yield* steps.insert(records.insert(Invitation, { id: invitation, organization, email, invitedBy: principal.person as never }));
    yield* move("pending");
    return { invitation };
  });

export default send;
