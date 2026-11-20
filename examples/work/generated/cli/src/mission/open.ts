// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/mission/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { title: Flag.String("title").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), target: Flag.String("target").pipe(Flag.withMetavar("json"), Flag.withDescription("A JSON value.")), blueprint: Flag.String("blueprint").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.open), Output.answer(json)),
).pipe(Command.withDescription("Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. Moves the mission into being to intake."));
