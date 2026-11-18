// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/session/sign-in.ts";
import { Acme } from "../client.ts";

/** Sign in with email and password. The token is the bearer for every later call. */
export const signIn = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.session["sign-in"]({ payload }));
