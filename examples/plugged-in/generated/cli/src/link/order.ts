// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/link/order.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Move a link to a zero-based position. A position past the end puts it last. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const order = Command.make(
  "order",
  { link: Flag.String("link"), position: Flag.String("position"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.link.order), Output.answer(json)),
);
