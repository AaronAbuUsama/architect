import { Blueprint } from "orthograph";
import { Event } from "../event/thing.ts";
import { Count, Holder } from "../../values/counts.ts";

export const Ticket = Blueprint.thing({
  description: "A free ticket for some seats at an event, held under a name.",
  fields: { id: Blueprint.id("tkt"), event: Event.fields.id, holder: Holder, seats: Count },
});
