// Generated from blueprint/things/link/verbs/order.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/link/verbs/order.ts";
import { LinkAlreadyRemoved, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("order", "/link/order", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [LinkAlreadyRemoved, NotAllowed],
});
export const steps = ["link.order.load", "link.order.record"] as const;
