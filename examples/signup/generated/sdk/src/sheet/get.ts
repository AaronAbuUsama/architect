// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/sheet/get.ts";
import { Signup } from "../client.ts";

/** Read one sheet by its id: title, places, taken, state. */
export const get = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Signup, (client) => client.sheet.get({ payload }));
