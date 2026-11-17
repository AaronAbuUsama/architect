// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/question/ask.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner about one gap in the blueprint, with lettered answers. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const ask = Command.make(
  "ask",
  { mission: Flag.String("mission"), asks: Flag.String("asks"), about: Flag.String("about"), gap: Flag.String("gap"), options: Flag.String("options"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.question.ask), Output.answer(json)),
);
