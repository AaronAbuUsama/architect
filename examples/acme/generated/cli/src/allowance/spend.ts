// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/allowance/spend.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Spend from what is left of this month's allowance. Every flag is text; the declaration decodes it. */
export const spend = Command.make(
  "spend",
  { allowance: Flag.String("allowance"), amount: Flag.String("amount"), memo: Flag.String("memo") },
  (flags) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.spend), answer),
);
