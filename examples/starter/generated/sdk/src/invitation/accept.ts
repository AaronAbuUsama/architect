// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/invitation/accept.ts";
import { Starter } from "../client.ts";

/** Accept an invitation and become a member of its organisation. */
export const accept = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.invitation.accept({ payload }));
