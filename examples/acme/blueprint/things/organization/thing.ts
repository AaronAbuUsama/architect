import { Blueprint } from "@architect/blueprint";
import { Person } from "../person/thing.ts";
import { Amount } from "../../values/money.ts";

export const Organization = Blueprint.thing({
  description: "A company whose owner hands out allowances, up to a cap each.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id, cap: Amount },
});
