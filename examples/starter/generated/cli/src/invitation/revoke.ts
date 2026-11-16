// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/invitation/revoke.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Withdraw an invitation that hasn't been accepted. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const revoke = Command.make(
  "revoke",
  { invitation: Flag.String("invitation"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.invitation.revoke), answer(json)),
);
