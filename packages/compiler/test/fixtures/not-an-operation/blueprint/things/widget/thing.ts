import { Blueprint } from "@formants/forman";
export const Widget = Blueprint.thing({
  description: "A planted thing whose verb file holds no operation.",
  fields: { id: Blueprint.id("wid") },
});
