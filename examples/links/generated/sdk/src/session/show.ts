// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/session/show.ts";
import { Links } from "../client.ts";

/** Who is signed in. */
export const show = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.session.show({ payload }));
