// Generated from blueprint/things/invitation/verbs/accept.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("InvitationNotPending", "NotAllowed");

export default defineAction({
  description: "Accept an invitation and become a member of its organisation. (acme's invitation.accept; open to invitation.invitee.)",
  schema: z.object({
    invitation: z.string().startsWith("inv_").describe("the invitation.id"),
  }),
  outputSchema: z.object({
    organization: z.string().startsWith("org_").describe("the invitation.organization"),
    membership: z.string().startsWith("mem_").describe("the membership.id"),
  }),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"invitation.accept","route":"invitation/accept","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
