import { Blueprint, Schema } from "orthograph";
import { Handle } from "../handle/thing.ts";
import { Link } from "../link/thing.ts";
import { Person } from "../person/thing.ts";

export const Profile = Blueprint.thing({
  description: "A person's public page with their links in the order they picked.",
  fields: {
    id: Blueprint.id("prf"),
    handle: Handle.fields.id,
    owner: Person.fields.id,
    status: Blueprint.value(Schema.Literals(["active", "hidden"])),
    links: Blueprint.value(Schema.fromJsonString(Schema.Array(Link.fields.id.value.schema))),
  },
});
