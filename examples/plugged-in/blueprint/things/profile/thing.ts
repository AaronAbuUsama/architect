import { Blueprint, Schema } from "orthograph";
import { Handle } from "../handle/thing.ts";

export const Profile = Blueprint.thing({
  description: "A claimed name's public page, with its links in the order they were put.",
  code: "PR",
  fields: {
    id: Blueprint.id("prf"),
    handle: Handle.fields.id,
    links: Blueprint.value(Schema.fromJsonString(Schema.Array(Schema.String))), // the ordered link ids
  },
  unique: { handle: {} },
});
