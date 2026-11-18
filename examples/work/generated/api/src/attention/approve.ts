// Generated from blueprint/things/attention/verbs/approve.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/attention/verbs/approve.ts";
import { AttentionNotOpen, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("approve", "/attention/approve", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [AttentionNotOpen, NotAllowed],
});
export const steps = ["attention.approve.record"] as const;
