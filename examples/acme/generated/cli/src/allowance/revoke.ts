// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/allowance/revoke.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Stop an allowance. Nothing more can be spent from it. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const revoke = Command.make(
  "revoke",
  { allowance: Flag.String("allowance"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.revoke), answer(json)),
);
