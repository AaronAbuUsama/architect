// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/mission/tasks.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** The mission's tasks, each in the column its facts put it in. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const tasks = Command.make(
  "tasks",
  { mission: Flag.String("mission"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.tasks), Output.answer(json)),
);
