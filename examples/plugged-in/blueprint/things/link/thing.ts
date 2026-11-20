import { Blueprint } from "orthograph";
import { LinkTitle, LinkUrl } from "../../values/page.ts";
import { Handle } from "../handle/thing.ts";
import { Profile } from "../profile/thing.ts";

export const Link = Blueprint.thing({
  description: "A title and web address on a public page.",
  code: "LN",
  fields: { id: Blueprint.id("lnk"), profile: Profile.fields.id, owner: Handle.fields.owner, title: LinkTitle, url: LinkUrl },
});
