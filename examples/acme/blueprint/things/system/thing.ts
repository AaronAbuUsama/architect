import { Blueprint } from "@architect/blueprint";

export const System = Blueprint.thing({
  description: "The running application itself.",
  fields: { id: Blueprint.id("sys") },
});
