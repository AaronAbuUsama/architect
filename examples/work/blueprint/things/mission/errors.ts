import { Blueprint } from "@architect/blueprint";

/** Start waits until every intake question is answered or spiked. */
export class MissionHasOpenQuestions extends Blueprint.error({ open: Blueprint.uint(16) }, { exit: 51 }) {}
