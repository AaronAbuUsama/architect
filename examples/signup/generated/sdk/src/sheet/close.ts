// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/sheet/close.ts";
import { call, type CallOptions } from "../client.ts";

/** Take a sheet down. Nobody can join it after this. */
export const close = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.sheet.close({ payload }));
