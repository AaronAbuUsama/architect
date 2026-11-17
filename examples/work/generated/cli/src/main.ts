#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `work <thing> <verb> --<field> <value>`. Talks to WORK_URL, signed in with WORK_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { approve as attentionApprove } from "./attention/approve.ts";
import { decline as attentionDecline } from "./attention/decline.ts";
import { list as attentionList } from "./attention/list.ts";
import { raise as attentionRaise } from "./attention/raise.ts";
import { record as factRecord } from "./fact/record.ts";
import { add as milestoneAdd } from "./milestone/add.ts";
import { drop as milestoneDrop } from "./milestone/drop.ts";
import { list as milestoneList } from "./milestone/list.ts";
import { finish as missionFinish } from "./mission/finish.ts";
import { get as missionGet } from "./mission/get.ts";
import { list as missionList } from "./mission/list.ts";
import { open as missionOpen } from "./mission/open.ts";
import { pause as missionPause } from "./mission/pause.ts";
import { resume as missionResume } from "./mission/resume.ts";
import { start as missionStart } from "./mission/start.ts";
import { stop as missionStop } from "./mission/stop.ts";
import { tasks as missionTasks } from "./mission/tasks.ts";
import { signUp as personSignUp } from "./person/sign-up.ts";
import { answer as questionAnswer } from "./question/answer.ts";
import { ask as questionAsk } from "./question/ask.ts";
import { list as questionList } from "./question/list.ts";
import { spike as questionSpike } from "./question/spike.ts";
import { fail as runFail } from "./run/fail.ts";
import { finish as runFinish } from "./run/finish.ts";
import { list as runList } from "./run/list.ts";
import { report as runReport } from "./run/report.ts";
import { start as runStart } from "./run/start.ts";
import { stop as runStop } from "./run/stop.ts";
import { show as sessionShow } from "./session/show.ts";
import { signIn as sessionSignIn } from "./session/sign-in.ts";

// The release version is stamped in when the CLI is published (`architect publish`); run from source, it says 0.0.0.
declare const ARCHITECT_VERSION: string | undefined;

const attention = Command.make("attention").pipe(Command.withSubcommands([attentionApprove, attentionDecline, attentionList, attentionRaise]));
const fact = Command.make("fact").pipe(Command.withSubcommands([factRecord]));
const milestone = Command.make("milestone").pipe(Command.withSubcommands([milestoneAdd, milestoneDrop, milestoneList]));
const mission = Command.make("mission").pipe(Command.withSubcommands([missionFinish, missionGet, missionList, missionOpen, missionPause, missionResume, missionStart, missionStop, missionTasks]));
const person = Command.make("person").pipe(Command.withSubcommands([personSignUp]));
const question = Command.make("question").pipe(Command.withSubcommands([questionAnswer, questionAsk, questionList, questionSpike]));
const run = Command.make("run").pipe(Command.withSubcommands([runFail, runFinish, runList, runReport, runStart, runStop]));
const session = Command.make("session").pipe(Command.withSubcommands([sessionShow, sessionSignIn]));

Command.make("work").pipe(
  Command.withSubcommands([attention, fact, milestone, mission, person, question, run, session]),
  Command.run({ version: typeof ARCHITECT_VERSION === "string" ? ARCHITECT_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["WORK_URL"] ?? "http://127.0.0.1:8787", process.env["WORK_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
