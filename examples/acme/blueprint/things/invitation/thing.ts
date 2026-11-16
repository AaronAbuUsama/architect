import { Blueprint } from "@architect/blueprint";
import { Organization } from "../organization/thing.ts";
import { Person } from "../person/thing.ts";

export const Invitation = Blueprint.thing({
  description: "An offer to join an organisation, sent to an email address.",
  fields: { id: Blueprint.id("inv"), organization: Organization.fields.id, email: Person.fields.email, invitedBy: Person.fields.id },
});
