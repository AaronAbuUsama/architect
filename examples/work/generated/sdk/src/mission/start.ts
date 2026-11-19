// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/start.ts";
import { call, type CallOptions } from "../client.ts";

/** Start the mission once intake is done. From here the manager only orchestrates. */
export const start = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.start({ payload }));
