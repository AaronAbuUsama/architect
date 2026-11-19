// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/milestone/add.ts";
import { call, type CallOptions } from "../client.ts";

/** Add a milestone to a mission. Its tasks appear at once: its kinds over its subject. */
export const add = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.milestone.add({ payload }));
