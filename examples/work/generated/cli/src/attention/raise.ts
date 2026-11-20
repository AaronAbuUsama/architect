// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/attention/raise.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner for a decision only they can make. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const raise = Command.make(
  "raise",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("An id (msn_...).")), kind: Flag.String("kind").pipe(Flag.withMetavar("json"), Flag.withDescription("A JSON value.")), title: Flag.String("title").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), why: Flag.String("why").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), task: Flag.String("task").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attention.raise), Output.answer(json)),
).pipe(Command.withDescription("Ask the mission's owner for a decision only they can make. Moves the attention into being to open."));
