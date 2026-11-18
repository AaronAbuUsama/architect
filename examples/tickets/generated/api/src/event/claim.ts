// Generated from blueprint/things/event/verbs/claim.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/event/verbs/claim.ts";
import { SoldOut, EventNotOnSale } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("claim", "/event/claim", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [SoldOut, EventNotOnSale],
});
export const steps = ["event.claim.load", "event.claim.issue", "event.claim.count"] as const;
