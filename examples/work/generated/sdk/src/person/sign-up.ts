// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/person/sign-up.ts";
import { Work } from "../client.ts";

/** Sign up with an email address and a password. */
export const signUp = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.person["sign-up"]({ payload }));
