// Generated from blueprint/projections/cli.ts. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/allowance/spend.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Spend from what is left of this month's allowance. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const spend = Command.make(
  "spend",
  { allowance: Flag.String("allowance"), amount: Flag.String("amount"), memo: Flag.String("memo"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.allowance.spend), Output.answer(json)),
);
