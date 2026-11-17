// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/session/sign-in.ts";
import { Work } from "../client.ts";

/** Sign in with email and password. The token is the bearer for every later call. */
export const signIn = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.session["sign-in"]({ payload }));
