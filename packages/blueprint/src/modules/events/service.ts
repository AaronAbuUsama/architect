import { structOf } from "#modules/things/service.ts";
import type { EventsApi } from "./types.ts";

export const Events: EventsApi = {
  event: (fields) => Object.freeze({ kind: "event", fields, schema: structOf(fields) }),
};
