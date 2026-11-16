#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `acme <thing> <verb> --<field> <value>`. Talks to ACME_URL, signed in with ACME_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { get as allowanceGet } from "./allowance/get.ts";
import { grant as allowanceGrant } from "./allowance/grant.ts";
import { revoke as allowanceRevoke } from "./allowance/revoke.ts";
import { spend as allowanceSpend } from "./allowance/spend.ts";
import { create as organizationCreate } from "./organization/create.ts";

const allowance = Command.make("allowance").pipe(Command.withSubcommands([allowanceGet, allowanceGrant, allowanceRevoke, allowanceSpend]));
const organization = Command.make("organization").pipe(Command.withSubcommands([organizationCreate]));

Command.make("acme").pipe(
  Command.withSubcommands([allowance, organization]),
  Command.run({ version: "0.0.0" }),
  Effect.provide(Sdk.layer(process.env["ACME_URL"] ?? "http://127.0.0.1:8787", process.env["ACME_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
