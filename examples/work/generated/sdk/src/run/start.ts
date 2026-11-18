// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/run/start.ts";
import { Work } from "../client.ts";

/** Start an agent on one task. The run claims the task until it ends. */
export const start = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.run.start({ payload }));
