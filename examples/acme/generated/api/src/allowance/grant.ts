// Generated from blueprint/things/allowance/verbs/grant.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/allowance/verbs/grant.ts";
import { AllowanceLimitTooHigh, PersonNotFound, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("grant", "/allowance/grant", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [AllowanceLimitTooHigh, PersonNotFound, NotAllowed],
});
export const steps = ["allowance.grant.insert"] as const;
