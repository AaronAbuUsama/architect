// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/question/ask.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const ask = Command.make(
  "ask",
  { mission: Flag.String("mission").pipe(Flag.withMetavar("id"), Flag.withDescription("An id (msn_...).")), asks: Flag.String("asks").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), about: Flag.String("about").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), gap: Flag.String("gap").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), options: Flag.String("options").pipe(Flag.withMetavar("json"), Flag.withDescription("A JSON value.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.question.ask), Output.answer(json)),
).pipe(Command.withDescription("Ask the mission's owner about one gap in the blueprint, with lettered answers. Moves the question into being to asked."));
