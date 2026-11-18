// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/profile/get.ts";
import { Links } from "../client.ts";

/** Read a claimed name's public profile and its links in display order. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.profile.get({ payload }));
