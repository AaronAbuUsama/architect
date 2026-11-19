// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/get.ts";
import { call, type CallOptions } from "../client.ts";

/** Read one sheet by its id: title, places, taken, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.sheet.get({ payload }));
