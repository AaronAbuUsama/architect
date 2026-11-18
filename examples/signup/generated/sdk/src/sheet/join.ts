// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/sheet/join.ts";
import { Signup } from "../client.ts";

/** Take places on a sheet, for yourself and anyone with you. */
export const join = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Signup, (client) => client.sheet.join({ payload }));
