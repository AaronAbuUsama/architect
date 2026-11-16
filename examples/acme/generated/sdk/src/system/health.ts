// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@architect/blueprint";
import type { declaration } from "../../../api/src/system/health.ts";
import { Acme } from "../client.ts";

/** Is the application up? */
export const health = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.system.health({ payload }));
