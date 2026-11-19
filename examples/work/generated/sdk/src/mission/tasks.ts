// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/mission/tasks.ts";
import { call, type CallOptions } from "../client.ts";

/** The mission's tasks, each in the column its facts put it in. */
export const tasks = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.mission.tasks({ payload }));
