import { Blueprint } from "@formants/forman";

/** How many of something. */
export const Count = Blueprint.value(Blueprint.uint(32));
/** A short name a person types. */
export const Title = Blueprint.value(Blueprint.text({ max: 120 }));
