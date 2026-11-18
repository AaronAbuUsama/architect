import { Blueprint } from "orthograph";

/** How many of something. */
export const Count = Blueprint.value(Blueprint.uint(32));
/** An event's name, as it appears on the ticket. */
export const Title = Blueprint.value(Blueprint.text({ max: 120 }));
/** The name a ticket is held under, read out at the door. */
export const Holder = Blueprint.value(Blueprint.text({ max: 80 }));
