// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/open.ts";
import { call, type CallOptions } from "../client.ts";

/** Put up a sheet with a number of places. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.sheet.open({ payload }));
