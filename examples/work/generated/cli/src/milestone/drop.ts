// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/milestone/drop.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const drop = Command.make(
  "drop",
  { mission: Flag.String("mission"), milestone: Flag.String("milestone"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.milestone.drop), Output.answer(json)),
);
