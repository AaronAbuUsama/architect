// Generated from blueprint/things/invitation/verbs/revoke.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/invitation/verbs/revoke.ts";
import { InvitationNotPending, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("revoke", "/invitation/revoke", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [InvitationNotPending, NotAllowed],
});
export const steps = ["invitation.revoke.update"] as const;
