import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";

export const Sheet = Blueprint.thing({
  description: "A sign-up sheet with a fixed number of places.",
  fields: { id: Blueprint.id("sht"), title: Title, places: Count, taken: Count },
});
