// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/allowance/grant.ts";
import { call, type CallOptions } from "../client.ts";

/** Let a member spend from the organisation, up to a limit each month. */
export const grant = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.allowance.grant({ payload }));
