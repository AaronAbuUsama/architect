import { Blueprint } from "orthograph";
import { Count } from "../../values/counts.ts";

// Depends on the data: more seats asked for than there are places left.
export class SoldOut extends Blueprint.error({ left: Count }, { exit: 71 }) {}
