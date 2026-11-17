import { Blueprint } from "@formants/forman";
import { Cents } from "../../values/work.ts";

/** Starting it would take the mission past its share of the day's cap. */
export class RunOverBudget extends Blueprint.error({ left: Cents }, { exit: 61 }) {}
/** The agent type does not take this task's kind, or the model is not on its list. */
export class RunAgentCannot extends Blueprint.error({}, { exit: 62 }) {}
/** Another live run already claims the task. */
export class RunTaskClaimed extends Blueprint.error({}, { exit: 63 }) {}
