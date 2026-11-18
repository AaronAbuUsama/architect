#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `tickets <thing> <verb> --<field> <value>`. Talks to TICKETS_URL, signed in with TICKETS_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { claim as eventClaim } from "./event/claim.ts";
import { close as eventClose } from "./event/close.ts";
import { get as eventGet } from "./event/get.ts";
import { open as eventOpen } from "./event/open.ts";
import { cancel as ticketCancel } from "./ticket/cancel.ts";
import { checkIn as ticketCheckIn } from "./ticket/check-in.ts";
import { get as ticketGet } from "./ticket/get.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const event = Command.make("event").pipe(Command.withSubcommands([eventClaim, eventClose, eventGet, eventOpen]));
const ticket = Command.make("ticket").pipe(Command.withSubcommands([ticketCancel, ticketCheckIn, ticketGet]));

Command.make("tickets").pipe(
  Command.withSubcommands([event, ticket]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["TICKETS_URL"] ?? "http://127.0.0.1:8787", process.env["TICKETS_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
