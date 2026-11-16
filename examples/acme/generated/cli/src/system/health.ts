// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/system/health.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Is the application up? Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const health = Command.make(
  "health",
  { json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.system.health), answer(json)),
);
