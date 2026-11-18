// Generated from blueprint/things/ticket/verbs/cancel.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/ticket/verbs/cancel.ts";
import { TicketNotIssued } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("cancel", "/ticket/cancel", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [TicketNotIssued],
});
export const steps = ["ticket.cancel.record"] as const;
