// Generated from the blueprint. Do not edit.
import { Effect, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { declaration } from "../../../api/src/session/sign-in.ts";
import * as Sdk from "../../../sdk/src/index.ts";
import { answer } from "../output.ts";

/** Sign in with email and password. The token is the bearer for every later call. Every flag is text; the declaration decodes it. `--json` prints the whole answer as JSON. */
export const signIn = Command.make(
  "sign-in",
  { email: Flag.String("email"), password: Flag.String("password"), json: Flag.Boolean("json").pipe(Flag.withDefault(false)) },
  ({ json, ...flags }) => Schema.decodeUnknownEffect(declaration.payloadSchema)(flags).pipe(Effect.flatMap(Sdk.session.signIn), answer(json)),
);
