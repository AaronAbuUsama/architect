import { Blueprint } from "@architect/blueprint";
import { Person } from "../person/thing.ts";
import { Amount } from "../../values/money.ts";

// The starter's organisation, plus acme's cap: the most any one allowance may be granted.
export const Organization = Blueprint.thing({
  description: "A company whose owner hands out allowances, up to a cap each.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id, cap: Amount },
});
