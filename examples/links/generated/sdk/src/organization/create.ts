// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/organization/create.ts";
import { Links } from "../client.ts";

/** Found an organisation. Whoever founds it owns it, and is its first member. */
export const create = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.organization.create({ payload }));
