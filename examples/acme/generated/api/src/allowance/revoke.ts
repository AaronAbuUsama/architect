// Generated from blueprint/things/allowance/verbs/revoke.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/allowance/verbs/revoke.ts";
import { AllowanceNotActive, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("revoke", "/allowance/revoke", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [AllowanceNotActive, NotAllowed],
});
export const steps = ["allowance.revoke.update"] as const;
