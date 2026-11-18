// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/person/sign-up.ts";
import { Acme } from "../client.ts";

/** Sign up with an email address and a password. */
export const signUp = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.person["sign-up"]({ payload }));
