// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/event/claim.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Claim a ticket for one or more seats, held under a name. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const claim = Command.make(
  "claim",
  { event: Flag.String("event"), holder: Flag.String("holder"), seats: Flag.String("seats"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.event.claim), Output.answer(json)),
);
