// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/resume.ts";
import { call, type CallOptions } from "../client.ts";

/** Pick a paused mission up again. */
export const resume = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.resume({ payload }));
