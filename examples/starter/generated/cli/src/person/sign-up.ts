// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/person/sign-up.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Sign up with an email address and a password. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const signUp = Command.make(
  "sign-up",
  { email: Flag.String("email"), password: Flag.String("password"), name: Flag.String("name"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.person.signUp), answer(json)),
);
