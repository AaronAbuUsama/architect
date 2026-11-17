// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/mission/open.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const open = Command.make(
  "open",
  { title: Flag.String("title"), target: Flag.String("target"), blueprint: Flag.String("blueprint"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.mission.open), Output.answer(json)),
);
