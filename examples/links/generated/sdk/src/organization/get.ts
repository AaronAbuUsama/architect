// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/organization/get.ts";
import { Links } from "../client.ts";

/** Read one organization by its id: name, owner, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.organization.get({ payload }));
