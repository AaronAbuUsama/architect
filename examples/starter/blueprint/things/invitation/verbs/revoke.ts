import { Blueprint } from "@architect/blueprint";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.operation(Invitation, {
  description: "Withdraw an invitation that hasn't been accepted.",
  payload: { invitation: Invitation.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [owner.of("invitation.organization")],
  steps: { update: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
