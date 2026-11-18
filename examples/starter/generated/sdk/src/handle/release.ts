// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/release.ts";
import { Starter } from "../client.ts";

/** Free your name and take its public profile offline. */
export const release = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Starter, (client) => client.handle.release({ payload }));
