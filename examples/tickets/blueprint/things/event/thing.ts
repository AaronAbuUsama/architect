import { Blueprint } from "orthograph";
import { Count, Title } from "../../values/counts.ts";

export const Event = Blueprint.thing({
  description: "An event with a fixed number of places, and free tickets for them.",
  fields: { id: Blueprint.id("evt"), title: Title, places: Count, claimed: Count },
});
