// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/sheet/open.ts";
import { Signup } from "../client.ts";

/** Put up a sheet with a number of places. */
export const open = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Signup, (client) => client.sheet.open({ payload }));
