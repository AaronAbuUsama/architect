// Generated from the blueprint. Do not edit.
import { EventNames } from "@architect/blueprint/server";
import * as Attention from "../../../blueprint/things/attention/events.ts";
import * as Milestone from "../../../blueprint/things/milestone/events.ts";
import * as Mission from "../../../blueprint/things/mission/events.ts";
import * as Question from "../../../blueprint/things/question/events.ts";
import * as Run from "../../../blueprint/things/run/events.ts";

EventNames.name(Attention.AttentionApproved, "AttentionApproved");
EventNames.name(Attention.AttentionDeclined, "AttentionDeclined");
EventNames.name(Attention.AttentionRaised, "AttentionRaised");
EventNames.name(Milestone.MilestoneAdded, "MilestoneAdded");
EventNames.name(Milestone.MilestoneDropped, "MilestoneDropped");
EventNames.name(Mission.MissionFinished, "MissionFinished");
EventNames.name(Mission.MissionOpened, "MissionOpened");
EventNames.name(Mission.MissionPaused, "MissionPaused");
EventNames.name(Mission.MissionResumed, "MissionResumed");
EventNames.name(Mission.MissionStarted, "MissionStarted");
EventNames.name(Mission.MissionStopped, "MissionStopped");
EventNames.name(Question.QuestionAnswered, "QuestionAnswered");
EventNames.name(Question.QuestionAsked, "QuestionAsked");
EventNames.name(Question.QuestionSpiked, "QuestionSpiked");
EventNames.name(Run.RunFailed, "RunFailed");
EventNames.name(Run.RunFinished, "RunFinished");
EventNames.name(Run.RunReported, "RunReported");
EventNames.name(Run.RunStarted, "RunStarted");
EventNames.name(Run.RunStopped, "RunStopped");

export const names = ["AttentionApproved", "AttentionDeclined", "AttentionRaised", "MilestoneAdded", "MilestoneDropped", "MissionFinished", "MissionOpened", "MissionPaused", "MissionResumed", "MissionStarted", "MissionStopped", "QuestionAnswered", "QuestionAsked", "QuestionSpiked", "RunFailed", "RunFinished", "RunReported", "RunStarted", "RunStopped"] as const;
