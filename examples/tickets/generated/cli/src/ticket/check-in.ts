// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/ticket/check-in.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Let the holder in at the door. A ticket gets in once. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const checkIn = Command.make(
  "check-in",
  { ticket: Flag.String("ticket"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.ticket.checkIn), Output.answer(json)),
);
