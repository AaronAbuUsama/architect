// Generated from blueprint/things/allowance/verbs/grant.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/allowance/verbs/grant.ts";
import { AllowanceLimitTooHigh, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("grant", "/allowance/grant", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [AllowanceLimitTooHigh, NotAllowed],
});
export const steps = ["allowance.grant.insert"] as const;
