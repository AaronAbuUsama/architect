import { Blueprint } from "orthograph";
import { LinkTitle, LinkUrl } from "../../values/links.ts";
import { Person } from "../person/thing.ts";

export const Link = Blueprint.thing({
  description: "A title and web address on a person's public profile.",
  fields: { id: Blueprint.id("lnk"), owner: Person.fields.id, title: LinkTitle, url: LinkUrl },
});
