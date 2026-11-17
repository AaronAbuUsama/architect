// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/fact/record.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Record a fact (spike only: the logbook's job once L3.01 lands). Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const record = Command.make(
  "record",
  { subject: Flag.String("subject"), kind: Flag.String("kind"), env: Flag.String("env"), result: Flag.String("result"), note: Flag.String("note"), revision: Flag.String("revision"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.fact.record), Output.answer(json)),
);
