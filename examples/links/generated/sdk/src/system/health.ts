// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/system/health.ts";
import { Links } from "../client.ts";

/** Is the application up? */
export const health = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Links, (client) => client.system.health({ payload }));
