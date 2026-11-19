import { Blueprint } from "orthograph";
import { HandleName } from "../../values/page.ts";

export const Handle = Blueprint.thing({
  description: "A public name, claimed once, that is the address of a public page.",
  code: "HN",
  fields: { id: Blueprint.id("hdl"), name: HandleName },
});
