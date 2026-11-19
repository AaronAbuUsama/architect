// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/open.ts";
import { call, type CallOptions } from "../client.ts";

/** Open a mission over the blueprint revision named. The manager starts by asking about the blueprint's gaps. */
export const open = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.mission.open({ payload }));
