// Generated from blueprint/things/allowance/verbs/spend.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/allowance/verbs/spend.ts";
import { AllowanceExceeded, AllowanceNotActive, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("spend", "/allowance/spend", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [AllowanceExceeded, AllowanceNotActive, NotAllowed],
});
export const steps = ["allowance.spend.load", "allowance.spend.record"] as const;
