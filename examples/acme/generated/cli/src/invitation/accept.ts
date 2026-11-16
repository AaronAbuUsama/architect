// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/invitation/accept.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Accept an invitation and become a member of its organisation. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const accept = Command.make(
  "accept",
  { invitation: Flag.String("invitation"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.invitation.accept), answer(json)),
);
