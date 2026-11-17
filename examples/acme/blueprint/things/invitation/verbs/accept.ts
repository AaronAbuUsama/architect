import { Blueprint } from "@formants/forman";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { invitee } from "../roles.ts";
import { Membership } from "../../membership/thing.ts";

export default Blueprint.operation(Invitation, {
  description: "Accept an invitation and become a member of its organisation.",
  payload: { invitation: Invitation.fields.id },
  answer: { organization: Invitation.fields.organization, membership: Membership.fields.id },
  move: machine.moves.accept,
  allowed: [invitee],
  steps: { join: Blueprint.step.database() },
  budget: { p95: "200 millis" },
});
