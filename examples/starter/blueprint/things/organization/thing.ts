import { Blueprint } from "orthograph";
import { Person } from "../person/thing.ts";

export const Organization = Blueprint.thing({
  description: "A company or team that people belong to.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id },
});
