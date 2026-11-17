// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/attention/approve.ts";
import { Work } from "../client.ts";

/** Say yes. For a promote, the promote runs. */
export const approve = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.attention.approve({ payload }));
