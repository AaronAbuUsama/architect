// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/system/health.ts";
import { call, type CallOptions } from "../client.ts";

/** Is the application up? */
export const health = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: false }, payload, options, (client) => client.system.health({ payload }));
