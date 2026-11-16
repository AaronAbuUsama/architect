// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/organization/create.ts";
import { Starter } from "../client.ts";

/** Found an organisation. Whoever founds it owns it, and is its first member. */
export const create = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.organization.create({ payload }));
