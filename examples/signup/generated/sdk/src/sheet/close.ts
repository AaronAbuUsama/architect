// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "@formants/forman";
import type { declaration } from "../../../api/src/sheet/close.ts";
import { Signup } from "../client.ts";

/** Take a sheet down. Nobody can join it after this. */
export const close = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Signup, (client) => client.sheet.close({ payload }));
