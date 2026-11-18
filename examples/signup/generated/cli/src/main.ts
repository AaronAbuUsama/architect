#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `signup <thing> <verb> --<field> <value>`. Talks to SIGNUP_URL, signed in with SIGNUP_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { close as sheetClose } from "./sheet/close.ts";
import { get as sheetGet } from "./sheet/get.ts";
import { join as sheetJoin } from "./sheet/join.ts";
import { open as sheetOpen } from "./sheet/open.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const sheet = Command.make("sheet").pipe(Command.withSubcommands([sheetClose, sheetGet, sheetJoin, sheetOpen]));

Command.make("signup").pipe(
  Command.withSubcommands([sheet]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["SIGNUP_URL"] ?? "http://127.0.0.1:8787", process.env["SIGNUP_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
