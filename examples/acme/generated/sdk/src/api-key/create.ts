// Generated from the blueprint. Do not edit.
import { Effect } from "effect";
import type { PayloadOf } from "orthograph";
import type { declaration } from "../../../api/src/api-key/create.ts";
import { Acme } from "../client.ts";

/** Create an API key in an organisation. The key itself is shown once. */
export const create = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client["api-key"].create({ payload }));
