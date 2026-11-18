// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/organization/create.ts";
import { Acme } from "../client.ts";

/** Found an organisation with its cap. Whoever founds it owns it, and is its first member. */
export const create = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.organization.create({ payload }));
