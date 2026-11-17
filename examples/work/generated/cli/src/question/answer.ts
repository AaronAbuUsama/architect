// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/question/answer.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Answer a question with one of its letters. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const answer = Command.make(
  "answer",
  { mission: Flag.String("mission"), question: Flag.String("question"), picked: Flag.String("picked"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.question.answer), Output.answer(json)),
);
