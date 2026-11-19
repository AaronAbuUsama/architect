// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/stop.ts";
import { call, type CallOptions } from "../client.ts";

/** Stop the mission for good. Its runs are stopped with it. */
export const stop = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.stop({ payload }));
