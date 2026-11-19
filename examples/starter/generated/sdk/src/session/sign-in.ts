// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/session/sign-in.ts";
import { call, type CallOptions } from "../client.ts";

/** Sign in with email and password. The token is the bearer for every later call. */
export const signIn = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.session["sign-in"]({ payload }));
