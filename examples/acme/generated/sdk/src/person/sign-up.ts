// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/person/sign-up.ts";
import { call, type CallOptions } from "../client.ts";

/** Sign up with an email address and a password. */
export const signUp = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.person["sign-up"]({ payload }));
