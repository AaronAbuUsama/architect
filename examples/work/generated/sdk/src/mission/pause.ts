// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/pause.ts";
import { call, type CallOptions } from "../client.ts";

/** Pause the mission, saying why. */
export const pause = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.pause({ payload }));
