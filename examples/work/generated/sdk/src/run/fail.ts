// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/run/fail.ts";
import { Work } from "../client.ts";

/** The run gave up, saying why. */
export const fail = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.run.fail({ payload }));
