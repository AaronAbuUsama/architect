#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `starter <thing> <verb> --<field> <value>`. Talks to STARTER_URL, signed in with STARTER_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { create as apiKeyCreate } from "./api-key/create.ts";
import { accept as invitationAccept } from "./invitation/accept.ts";
import { revoke as invitationRevoke } from "./invitation/revoke.ts";
import { send as invitationSend } from "./invitation/send.ts";
import { get as membershipGet } from "./membership/get.ts";
import { create as organizationCreate } from "./organization/create.ts";
import { get as organizationGet } from "./organization/get.ts";
import { signUp as personSignUp } from "./person/sign-up.ts";
import { show as sessionShow } from "./session/show.ts";
import { signIn as sessionSignIn } from "./session/sign-in.ts";
import { health as systemHealth } from "./system/health.ts";

// The release version is stamped in when the CLI is published (`forman publish`); run from source, it says 0.0.0.
declare const FORMAN_VERSION: string | undefined;

const apiKey = Command.make("api-key").pipe(Command.withSubcommands([apiKeyCreate]));
const invitation = Command.make("invitation").pipe(Command.withSubcommands([invitationAccept, invitationRevoke, invitationSend]));
const membership = Command.make("membership").pipe(Command.withSubcommands([membershipGet]));
const organization = Command.make("organization").pipe(Command.withSubcommands([organizationCreate, organizationGet]));
const person = Command.make("person").pipe(Command.withSubcommands([personSignUp]));
const session = Command.make("session").pipe(Command.withSubcommands([sessionShow, sessionSignIn]));
const system = Command.make("system").pipe(Command.withSubcommands([systemHealth]));

Command.make("starter").pipe(
  Command.withSubcommands([apiKey, invitation, membership, organization, person, session, system]),
  Command.run({ version: typeof FORMAN_VERSION === "string" ? FORMAN_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["STARTER_URL"] ?? "http://127.0.0.1:8787", process.env["STARTER_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
