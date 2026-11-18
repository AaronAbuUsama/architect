// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/invitation/accept.ts";
import { Links } from "../client.ts";

/** Accept an invitation and become a member of its organisation. */
export const accept = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.invitation.accept({ payload }));
