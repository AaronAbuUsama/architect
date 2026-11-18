// Generated from blueprint/things/ticket/verbs/check-in.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/ticket/verbs/check-in.ts";
import { TicketNotIssued } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("check-in", "/ticket/check-in", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [TicketNotIssued],
});
export const steps = ["ticket.check-in.record"] as const;
