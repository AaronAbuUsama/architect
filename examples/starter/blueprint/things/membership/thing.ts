import { Blueprint } from "@architect/blueprint";
import { Organization } from "../organization/thing.ts";
import { Person } from "../person/thing.ts";
import { Role } from "../../values/identity.ts";

export const Membership = Blueprint.thing({
  description: "A person's place in an organisation.",
  fields: { id: Blueprint.id("mem"), organization: Organization.fields.id, person: Person.fields.id, role: Role },
});
