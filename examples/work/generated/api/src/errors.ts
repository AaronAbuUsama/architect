// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames } from "orthograph/server";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import * as Mission from "../../../blueprint/things/mission/errors.ts";
import * as Question from "../../../blueprint/things/question/errors.ts";
import * as Run from "../../../blueprint/things/run/errors.ts";

ErrorNames.name(Mission.MissionHasOpenQuestions, "MissionHasOpenQuestions");
export class MissionHasOpenQuestions extends Schema.TaggedError<MissionHasOpenQuestions>()("MissionHasOpenQuestions", { code: Schema.Literal("MS-001"), ...Visibility.schema(Audience.principal(), Mission.MissionHasOpenQuestions.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "MS-001" as const; }
ErrorNames.name(Mission.MissionNotRunning, "MissionNotRunning");
export class MissionNotRunning extends Schema.TaggedError<MissionNotRunning>()("MissionNotRunning", { code: Schema.Literal("MS-002"), ...Visibility.schema(Audience.principal(), Mission.MissionNotRunning.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "MS-002" as const; }
ErrorNames.name(Mission.MissionNotInIntake, "MissionNotInIntake");
export class MissionNotInIntake extends Schema.TaggedError<MissionNotInIntake>()("MissionNotInIntake", { code: Schema.Literal("MS-003"), ...Visibility.schema(Audience.principal(), Mission.MissionNotInIntake.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "MS-003" as const; }
ErrorNames.name(Mission.MissionHasOpenTasks, "MissionHasOpenTasks");
export class MissionHasOpenTasks extends Schema.TaggedError<MissionHasOpenTasks>()("MissionHasOpenTasks", { code: Schema.Literal("MS-004"), ...Visibility.schema(Audience.principal(), Mission.MissionHasOpenTasks.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "MS-004" as const; }
ErrorNames.name(Mission.MissionClosed, "MissionClosed");
export class MissionClosed extends Schema.TaggedError<MissionClosed>()("MissionClosed", { code: Schema.Literal("MS-005"), ...Visibility.schema(Audience.principal(), Mission.MissionClosed.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "MS-005" as const; }
ErrorNames.name(Question.QuestionNoSuchOption, "QuestionNoSuchOption");
export class QuestionNoSuchOption extends Schema.TaggedError<QuestionNoSuchOption>()("QuestionNoSuchOption", { code: Schema.Literal("QU-001"), ...Visibility.schema(Audience.principal(), Question.QuestionNoSuchOption.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "QU-001" as const; }
ErrorNames.name(Run.RunOverBudget, "RunOverBudget");
export class RunOverBudget extends Schema.TaggedError<RunOverBudget>()("RunOverBudget", { code: Schema.Literal("RU-001"), ...Visibility.schema(Audience.principal(), Run.RunOverBudget.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "RU-001" as const; }
ErrorNames.name(Run.RunAgentCannot, "RunAgentCannot");
export class RunAgentCannot extends Schema.TaggedError<RunAgentCannot>()("RunAgentCannot", { code: Schema.Literal("RU-002"), ...Visibility.schema(Audience.principal(), Run.RunAgentCannot.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "RU-002" as const; }
ErrorNames.name(Run.RunTaskClaimed, "RunTaskClaimed");
export class RunTaskClaimed extends Schema.TaggedError<RunTaskClaimed>()("RunTaskClaimed", { code: Schema.Literal("RU-003"), ...Visibility.schema(Audience.principal(), Run.RunTaskClaimed.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "RU-003" as const; }
export class AttentionNotOpen extends Schema.TaggedError<AttentionNotOpen>()("AttentionNotOpen", { code: Schema.Literal("AT-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "AT-900" as const; }
export class MilestoneNotActive extends Schema.TaggedError<MilestoneNotActive>()("MilestoneNotActive", { code: Schema.Literal("ML-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "ML-900" as const; }
export class MissionNotIntake extends Schema.TaggedError<MissionNotIntake>()("MissionNotIntake", { code: Schema.Literal("MS-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "MS-900" as const; }
export class QuestionNotAsked extends Schema.TaggedError<QuestionNotAsked>()("QuestionNotAsked", { code: Schema.Literal("QU-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "QU-900" as const; }
export class RunNotRunning extends Schema.TaggedError<RunNotRunning>()("RunNotRunning", { code: Schema.Literal("RU-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "RU-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  MissionHasOpenQuestions: 51,
  MissionNotRunning: 56,
  MissionNotInIntake: 57,
  MissionHasOpenTasks: 58,
  MissionClosed: 59,
  QuestionNoSuchOption: 54,
  RunOverBudget: 61,
  RunAgentCannot: 62,
  RunTaskClaimed: 63,
  AttentionNotOpen: 55,
  MilestoneNotActive: 52,
  MissionNotIntake: 50,
  QuestionNotAsked: 53,
  RunNotRunning: 60,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  MissionHasOpenQuestions: "MS-001",
  MissionNotRunning: "MS-002",
  MissionNotInIntake: "MS-003",
  MissionHasOpenTasks: "MS-004",
  MissionClosed: "MS-005",
  QuestionNoSuchOption: "QU-001",
  RunOverBudget: "RU-001",
  RunAgentCannot: "RU-002",
  RunTaskClaimed: "RU-003",
  AttentionNotOpen: "AT-900",
  MilestoneNotActive: "ML-900",
  MissionNotIntake: "MS-900",
  QuestionNotAsked: "QU-900",
  RunNotRunning: "RU-900",
  NotAllowed: "AR-001",
} as const;

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  MissionHasOpenQuestions: Mission.MissionHasOpenQuestions,
  MissionNotRunning: Mission.MissionNotRunning,
  MissionNotInIntake: Mission.MissionNotInIntake,
  MissionHasOpenTasks: Mission.MissionHasOpenTasks,
  MissionClosed: Mission.MissionClosed,
  QuestionNoSuchOption: Question.QuestionNoSuchOption,
  RunOverBudget: Run.RunOverBudget,
  RunAgentCannot: Run.RunAgentCannot,
  RunTaskClaimed: Run.RunTaskClaimed,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { MissionHasOpenQuestions, MissionNotRunning, MissionNotInIntake, MissionHasOpenTasks, MissionClosed, QuestionNoSuchOption, RunOverBudget, RunAgentCannot, RunTaskClaimed, AttentionNotOpen, MilestoneNotActive, MissionNotIntake, QuestionNotAsked, RunNotRunning, NotAllowed };
