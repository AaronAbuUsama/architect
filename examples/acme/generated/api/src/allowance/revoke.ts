// Generated from blueprint/things/allowance/verbs/revoke.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/allowance/verbs/revoke.ts";
import { AllowanceNotActive, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("revoke", "/allowance/revoke", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [AllowanceNotActive, NotAllowed],
});
export const steps = ["allowance.revoke.update"] as const;
