// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/attention/raise.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Ask the mission's owner for a decision only they can make. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const raise = Command.make(
  "raise",
  { mission: Flag.String("mission"), kind: Flag.String("kind"), title: Flag.String("title"), why: Flag.String("why"), task: Flag.String("task"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.attention.raise), Output.answer(json)),
);
