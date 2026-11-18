// Generated from blueprint/things/event/verbs/close.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/event/verbs/close.ts";
import { EventNotOnSale } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("close", "/event/close", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [EventNotOnSale],
});
export const steps = ["event.close.record"] as const;
