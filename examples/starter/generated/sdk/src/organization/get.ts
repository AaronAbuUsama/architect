// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/organization/get.ts";
import { call, type CallOptions } from "../client.ts";

/** Read one organization by its id: name, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.organization.get({ payload }));
