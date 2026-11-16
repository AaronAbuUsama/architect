// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/membership/get.ts";
import { Acme } from "../client.ts";

/** Read one membership by its id: organization, person, role. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.membership.get({ payload }));
