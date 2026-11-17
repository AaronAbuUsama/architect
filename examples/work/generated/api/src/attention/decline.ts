// Generated from blueprint/things/attention/verbs/decline.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/attention/verbs/decline.ts";
import { AttentionNotOpen, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("decline", "/attention/decline", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [AttentionNotOpen, NotAllowed],
});
export const steps = ["attention.decline.record"] as const;
