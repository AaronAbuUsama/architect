// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/handle/release.ts";
import { PluggedIn } from "../client.ts";

/** Free your name and take its public page offline. Anyone may claim the name afterwards. */
export const release = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(PluggedIn, (client) => client.handle.release({ payload }));
