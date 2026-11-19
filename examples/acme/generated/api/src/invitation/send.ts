// Generated from blueprint/things/invitation/verbs/send.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/invitation/verbs/send.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("send", "/invitation/send", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = ["invitation.send.insert"] as const;
