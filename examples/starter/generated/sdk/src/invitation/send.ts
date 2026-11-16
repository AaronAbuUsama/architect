// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/invitation/send.ts";
import { Starter } from "../client.ts";

/** Invite someone to an organisation by email. */
export const send = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.invitation.send({ payload }));
