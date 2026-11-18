import { Blueprint } from "orthograph";

/** Start waits until every intake question is answered or spiked. */
export class MissionHasOpenQuestions extends Blueprint.error({ open: Blueprint.uint(16) }, { exit: 51 }) {}
/** Work only starts, and only asks for you, while the mission runs: not in intake, paused, done or stopped. */
export class MissionNotRunning extends Blueprint.error({}, { exit: 56 }) {}
/** Questions are asked in intake, before you press Start. */
export class MissionNotInIntake extends Blueprint.error({}, { exit: 57 }) {}
/** Finish waits until every task is closed by a fact up to the target. */
export class MissionHasOpenTasks extends Blueprint.error({ open: Blueprint.uint(16) }, { exit: 58 }) {}
/** A done or stopped mission takes no new milestones. */
export class MissionClosed extends Blueprint.error({}, { exit: 59 }) {}
