import { Blueprint } from "orthograph";
import { Count } from "../../values/counts.ts";

// Depends on the data: more people than there are places left.
export class SheetFull extends Blueprint.error({ left: Count }, { exit: 71 }) {}
