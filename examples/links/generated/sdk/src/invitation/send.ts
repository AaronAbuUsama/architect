// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/invitation/send.ts";
import { Links } from "../client.ts";

/** Invite someone to an organisation by email. */
export const send = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.invitation.send({ payload }));
