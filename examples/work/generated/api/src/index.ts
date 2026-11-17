// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as attentionApprove from "./attention/approve.ts";
import * as attentionDecline from "./attention/decline.ts";
import * as attentionList from "./attention/list.ts";
import * as attentionRaise from "./attention/raise.ts";
import * as milestoneAdd from "./milestone/add.ts";
import * as milestoneDrop from "./milestone/drop.ts";
import * as milestoneList from "./milestone/list.ts";
import * as missionFinish from "./mission/finish.ts";
import * as missionGet from "./mission/get.ts";
import * as missionList from "./mission/list.ts";
import * as missionOpen from "./mission/open.ts";
import * as missionPause from "./mission/pause.ts";
import * as missionResume from "./mission/resume.ts";
import * as missionStart from "./mission/start.ts";
import * as missionStop from "./mission/stop.ts";
import * as missionTasks from "./mission/tasks.ts";
import * as questionAnswer from "./question/answer.ts";
import * as questionAsk from "./question/ask.ts";
import * as questionList from "./question/list.ts";
import * as questionSpike from "./question/spike.ts";
import * as runFail from "./run/fail.ts";
import * as runFinish from "./run/finish.ts";
import * as runList from "./run/list.ts";
import * as runReport from "./run/report.ts";
import * as runStart from "./run/start.ts";
import * as runStop from "./run/stop.ts";

export class Attention extends HttpApiGroup.make("attention").add(attentionApprove.endpoint).add(attentionDecline.endpoint).add(attentionList.endpoint).add(attentionRaise.endpoint) {}
export class Milestone extends HttpApiGroup.make("milestone").add(milestoneAdd.endpoint).add(milestoneDrop.endpoint).add(milestoneList.endpoint) {}
export class Mission extends HttpApiGroup.make("mission").add(missionFinish.endpoint).add(missionGet.endpoint).add(missionList.endpoint).add(missionOpen.endpoint).add(missionPause.endpoint).add(missionResume.endpoint).add(missionStart.endpoint).add(missionStop.endpoint).add(missionTasks.endpoint) {}
export class Question extends HttpApiGroup.make("question").add(questionAnswer.endpoint).add(questionAsk.endpoint).add(questionList.endpoint).add(questionSpike.endpoint) {}
export class Run extends HttpApiGroup.make("run").add(runFail.endpoint).add(runFinish.endpoint).add(runList.endpoint).add(runReport.endpoint).add(runStart.endpoint).add(runStop.endpoint) {}
export class Api extends HttpApi.make("work").add(Attention).add(Milestone).add(Mission).add(Question).add(Run) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "attention.approve": attentionApprove, "attention.decline": attentionDecline, "attention.list": attentionList, "attention.raise": attentionRaise, "milestone.add": milestoneAdd, "milestone.drop": milestoneDrop, "milestone.list": milestoneList, "mission.finish": missionFinish, "mission.get": missionGet, "mission.list": missionList, "mission.open": missionOpen, "mission.pause": missionPause, "mission.resume": missionResume, "mission.start": missionStart, "mission.stop": missionStop, "mission.tasks": missionTasks, "question.answer": questionAnswer, "question.ask": questionAsk, "question.list": questionList, "question.spike": questionSpike, "run.fail": runFail, "run.finish": runFinish, "run.list": runList, "run.report": runReport, "run.start": runStart, "run.stop": runStop } as const;
