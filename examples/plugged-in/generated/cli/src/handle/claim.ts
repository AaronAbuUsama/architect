// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/handle/claim.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Claim a free name and make it the address of a public page, with its profile. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const claim = Command.make(
  "claim",
  { name: Flag.String("name"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.handle.claim), Output.answer(json)),
);
