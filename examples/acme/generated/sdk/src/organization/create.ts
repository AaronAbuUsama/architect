// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/organization/create.ts";
import { Acme } from "../client.ts";

/** Start an organisation. Whoever creates it owns it. */
export const create = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.organization.create({ payload }));
