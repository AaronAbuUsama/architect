import { Blueprint } from "orthograph";
import { Organization } from "../organization/thing.ts";
import { Person } from "../person/thing.ts";
import { Amount } from "../../values/money.ts";

export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: {
    id: Blueprint.id("alw"),
    organization: Organization.fields.id,
    member: Person.fields.id,
    limit: Amount,
    spent: Amount,
  },
});
