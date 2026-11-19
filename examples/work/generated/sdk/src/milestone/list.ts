// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/milestone/list.ts";
import { call, type CallOptions } from "../client.ts";

/** List milestones, oldest first, 50 to a page, filtered by mission, state. */
export const list = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.milestone.list({ payload }));
