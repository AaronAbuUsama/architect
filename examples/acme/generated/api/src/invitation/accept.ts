// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/invitation/verbs/accept.ts";
import { InvitationNotPending, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("accept", "/invitation/accept", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [InvitationNotPending, NotAllowed],
});
export const steps = ["invitation.accept.join"] as const;
