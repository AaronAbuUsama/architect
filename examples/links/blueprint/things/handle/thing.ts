import { Blueprint } from "orthograph";
import { HandleName } from "../../values/links.ts";
import { Person } from "../person/thing.ts";

export const Handle = Blueprint.thing({
  description: "A public name that belongs to one person until they release it.",
  code: "HN",
  fields: { id: Blueprint.id("hdl"), name: HandleName, owner: Person.fields.id },
});
