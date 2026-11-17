// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/run/start.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Start an agent on one task. The run claims the task until it ends. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const start = Command.make(
  "start",
  { mission: Flag.String("mission"), task: Flag.String("task"), agent: Flag.String("agent"), model: Flag.String("model"), budget: Flag.String("budget"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.run.start), Output.answer(json)),
);
