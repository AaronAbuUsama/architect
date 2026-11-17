// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/run/fail.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The run gave up, saying why. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const fail = Command.make(
  "fail",
  { mission: Flag.String("mission"), run: Flag.String("run"), why: Flag.String("why"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.run.fail), Output.answer(json)),
);
