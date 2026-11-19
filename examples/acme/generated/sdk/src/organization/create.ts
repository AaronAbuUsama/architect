// Generated from blueprint/projections/sdk.ts. Do not edit.
import type { PayloadOf } from "orthograph";
import { declaration } from "../../../api/src/organization/create.ts";
import { call, type CallOptions } from "../client.ts";

/** Found an organisation with its cap. Whoever founds it owns it, and is its first member. */
export const create = (payload: PayloadOf<typeof declaration>, options?: CallOptions) =>
  call({ payload: declaration.payloadSchema, retry: true }, payload, options, (client) => client.organization.create({ payload }));
