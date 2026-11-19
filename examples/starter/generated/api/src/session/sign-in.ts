// Generated from blueprint/things/session/verbs/sign-in.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/session/verbs/sign-in.ts";
import { SessionCredentialsWrong } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("sign-in", "/session/sign-in", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [SessionCredentialsWrong],
});
export const steps = ["session.sign-in.verify"] as const;
