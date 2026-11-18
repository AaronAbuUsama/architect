// Generated from blueprint/things/invitation/verbs/revoke.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("InvitationNotPending", "NotAllowed");

export default defineAction({
  description: "Withdraw an invitation that hasn't been accepted. (acme's invitation.revoke; open to organization.owner of its invitation.organization.)",
  schema: z.object({
    invitation: z.string().startsWith("inv_").describe("the invitation.id"),
  }),
  outputSchema: z.object({}),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"invitation.revoke","route":"invitation/revoke","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
