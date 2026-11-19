// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/api-key/create.ts";
import { call, type CallOptions } from "../client.ts";

/** Create an API key in an organisation. The key itself is shown once. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client["api-key"].create({ payload }));
