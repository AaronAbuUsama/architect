// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/list.ts";
import { call, type CallOptions } from "../client.ts";

/** List missions, newest first, 20 to a page, filtered by owner, state. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.list({ payload }));
