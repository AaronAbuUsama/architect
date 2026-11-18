// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@formants/language-effect";
import { declaration as attentionApprove } from "../../api/src/attention/approve.ts";
import { declaration as attentionDecline } from "../../api/src/attention/decline.ts";
import { declaration as attentionList } from "../../api/src/attention/list.ts";
import { declaration as attentionRaise } from "../../api/src/attention/raise.ts";
import { declaration as milestoneAdd } from "../../api/src/milestone/add.ts";
import { declaration as milestoneDrop } from "../../api/src/milestone/drop.ts";
import { declaration as milestoneList } from "../../api/src/milestone/list.ts";
import { declaration as missionFinish } from "../../api/src/mission/finish.ts";
import { declaration as missionGet } from "../../api/src/mission/get.ts";
import { declaration as missionList } from "../../api/src/mission/list.ts";
import { declaration as missionOpen } from "../../api/src/mission/open.ts";
import { declaration as missionPause } from "../../api/src/mission/pause.ts";
import { declaration as missionResume } from "../../api/src/mission/resume.ts";
import { declaration as missionStart } from "../../api/src/mission/start.ts";
import { declaration as missionStop } from "../../api/src/mission/stop.ts";
import { declaration as missionTasks } from "../../api/src/mission/tasks.ts";
import { declaration as questionAnswer } from "../../api/src/question/answer.ts";
import { declaration as questionAsk } from "../../api/src/question/ask.ts";
import { declaration as questionList } from "../../api/src/question/list.ts";
import { declaration as questionSpike } from "../../api/src/question/spike.ts";
import { declaration as runFail } from "../../api/src/run/fail.ts";
import { declaration as runFinish } from "../../api/src/run/finish.ts";
import { declaration as runList } from "../../api/src/run/list.ts";
import { declaration as runReport } from "../../api/src/run/report.ts";
import { declaration as runStart } from "../../api/src/run/start.ts";
import { declaration as runStop } from "../../api/src/run/stop.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "attention.approve": { description: "Say yes. For a promote, the promote runs.", operation: attentionApprove },
  "attention.decline": { description: "Say not yet, and why. The task stays where its facts put it.", operation: attentionDecline },
  "attention.list": { description: "List attentions, newest first, 50 to a page, filtered by mission, state.", operation: attentionList },
  "attention.raise": { description: "Ask the mission's owner for a decision only they can make.", operation: attentionRaise },
  "milestone.add": { description: "Add a milestone to a mission. Its tasks appear at once: its kinds over its subject.", operation: milestoneAdd },
  "milestone.drop": { description: "Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step.", operation: milestoneDrop },
  "milestone.list": { description: "List milestones, oldest first, 50 to a page, filtered by mission, state.", operation: milestoneList },
  "mission.finish": { description: "Close the mission: every task is closed by a fact up to its target.", operation: missionFinish },
  "mission.get": { description: "Read one mission by its id: owner, title, target, blueprint, state.", operation: missionGet },
  "mission.list": { description: "List missions, newest first, 20 to a page, filtered by owner, state.", operation: missionList },
  "mission.open": { description: "Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps.", operation: missionOpen },
  "mission.pause": { description: "Pause the mission, saying why.", operation: missionPause },
  "mission.resume": { description: "Pick a paused mission up again.", operation: missionResume },
  "mission.start": { description: "Start the mission once intake is done. From here the manager only orchestrates.", operation: missionStart },
  "mission.stop": { description: "Stop the mission for good. Its runs are stopped with it.", operation: missionStop },
  "mission.tasks": { description: "The mission's tasks, each in the column its facts put it in.", operation: missionTasks },
  "question.answer": { description: "Answer a question with one of its letters.", operation: questionAnswer },
  "question.ask": { description: "Ask the mission's owner about one gap in the blueprint, with lettered answers.", operation: questionAsk },
  "question.list": { description: "List questions, oldest first, 50 to a page, filtered by mission, state.", operation: questionList },
  "question.spike": { description: "Not sure yet: turn the question into a spike task on its subject.", operation: questionSpike },
  "run.fail": { description: "The run gave up, saying why.", operation: runFail },
  "run.finish": { description: "The run pushed its branch. CI proves it; the run cannot close its own task.", operation: runFinish },
  "run.list": { description: "List runs, newest first, 50 to a page, filtered by mission, task, state.", operation: runList },
  "run.report": { description: "Say how the run is going. It moves no card.", operation: runReport },
  "run.start": { description: "Start an agent on one task. The run claims the task until it ends.", operation: runStart },
  "run.stop": { description: "Stop the run. A person's act, or the mission stopping.", operation: runStop },
} as const satisfies { readonly [name: string]: McpEntry };
