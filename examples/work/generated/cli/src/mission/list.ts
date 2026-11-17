// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/mission/list.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** List missions, newest first, 20 to a page, filtered by owner, state. Every flag is text; the declaration decodes it; a flag left out is not sent. `--json` prints the whole answer as JSON. */
export const list = Command.make(
  "list",
  { owner: Flag.optional(Flag.String("owner")), state: Flag.optional(Flag.String("state")), cursor: Flag.optional(Flag.String("cursor")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(Output.supplied(flags)).pipe(Effect.flatMap(Sdk.mission.list), Output.answer(json)),
);
