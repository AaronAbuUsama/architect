// Generated from the blueprint. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/milestone/drop.ts";
import { call, type CallOptions } from "../client.ts";

/** Drop a milestone from its mission's scope. Its tasks leave the board; the burn-down shows the step. */
export const drop = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.milestone.drop({ payload }));
