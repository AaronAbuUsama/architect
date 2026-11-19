// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/membership/get.ts";
import { call, type CallOptions } from "../client.ts";

/** Read one membership by its id: organization, person, role. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.membership.get({ payload }));
