// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/allowance/grant.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Let a member spend from the organisation, up to a limit each month. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const grant = Command.make(
  "grant",
  { organization: Flag.String("organization"), member: Flag.String("member"), limit: Flag.String("limit"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.grant), answer(json)),
);
