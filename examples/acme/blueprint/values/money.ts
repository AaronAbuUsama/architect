import { Blueprint } from "@architect/blueprint";

export const Amount = Blueprint.value(Blueprint.uint(128));

/** What a spend was for, in a few words. */
export const Memo = Blueprint.value(Blueprint.text());
