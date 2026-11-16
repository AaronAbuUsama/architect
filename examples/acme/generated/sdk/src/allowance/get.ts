// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/allowance/get.ts";
import { Acme } from "../client.ts";

/** Read one allowance by its id: organization, member, limit, spent, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.allowance.get({ payload }));
