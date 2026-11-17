// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/run/report.ts";
import { Work } from "../client.ts";

/** Say how the run is going. It moves no card. */
export const report = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Work, (client) => client.run.report({ payload }));
