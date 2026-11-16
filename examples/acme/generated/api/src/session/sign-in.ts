// Generated from blueprint/things/session/verbs/sign-in.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/session/verbs/sign-in.ts";
import { SessionCredentialsWrong } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("sign-in", "/session/sign-in", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [SessionCredentialsWrong],
});
export const steps = ["session.sign-in.verify"] as const;
