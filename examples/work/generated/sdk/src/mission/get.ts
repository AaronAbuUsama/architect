// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/get.ts";
import { call, type CallOptions } from "../client.ts";

/** Read one mission by its id: owner, title, target, blueprint, state. */
export const get = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.get({ payload }));
