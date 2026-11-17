// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/session/show.ts";
import { Work } from "../client.ts";

/** Who is signed in. */
export const show = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.session.show({ payload }));
