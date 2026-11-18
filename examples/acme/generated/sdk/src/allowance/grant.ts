// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/allowance/grant.ts";
import { Acme } from "../client.ts";

/** Let a member spend from the organisation, up to a limit each month. */
export const grant = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.allowance.grant({ payload }));
