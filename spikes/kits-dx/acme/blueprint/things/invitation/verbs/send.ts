// PROPOSED (design/decisions/K1-kits.md). A sketch of acme with kits mounted: not compiled, not imported.
// Changed from today: a mail step. The email kit's Mail.send is a dependency, so it is a step with its own span,
// its declared errors, and a uses-dependency edge that `architect impact` follows when the kit is upgraded.
import { Blueprint } from "@architect/blueprint";
import { Mail } from "@architect/kit-email/blueprint";
import { Invitation } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.operation(Invitation, {
  description: "Invite someone to an organisation by email.",
  payload: { organization: Invitation.fields.organization, email: Invitation.fields.email },
  answer: { invitation: Invitation.fields.id },
  move: machine.moves.send,
  allowed: [owner.of("organization")],
  steps: { insert: Blueprint.step.database(), mail: Blueprint.step.dependency(Mail.send) },
  budget: { p95: "300 millis" },
});
