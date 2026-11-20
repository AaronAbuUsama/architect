// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration as Declaration } from "../../../api/src/person/sign-up.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash

/** Sign up with an email address and a password. Each flag is handed on as text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const signUp = Command.make(
  "sign-up",
  { email: Flag.String("email").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), password: Flag.String("password").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), name: Flag.String("name").pipe(Flag.withMetavar("text"), Flag.withDescription("Text.")), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.person.signUp), Output.answer(json)),
).pipe(Command.withDescription("Sign up with an email address and a password."));
