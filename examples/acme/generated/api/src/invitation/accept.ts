// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/invitation/verbs/accept.ts";
import { InvitationNotPending, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("accept", "/invitation/accept", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [InvitationNotPending, NotAllowed],
});
export const steps = ["invitation.accept.join"] as const;
