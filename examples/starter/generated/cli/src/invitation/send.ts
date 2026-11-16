// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/invitation/send.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Invite someone to an organisation by email. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const send = Command.make(
  "send",
  { organization: Flag.String("organization"), email: Flag.String("email"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.invitation.send), answer(json)),
);
