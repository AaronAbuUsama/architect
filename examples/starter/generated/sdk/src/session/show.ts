// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/session/show.ts";
import { Starter } from "../client.ts";

/** Who is signed in. */
export const show = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.session.show({ payload }));
