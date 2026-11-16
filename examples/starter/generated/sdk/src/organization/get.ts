// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/organization/get.ts";
import { Starter } from "../client.ts";

/** Read one organization by its id: name, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.organization.get({ payload }));
