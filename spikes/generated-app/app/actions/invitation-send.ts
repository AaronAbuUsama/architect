// Generated from blueprint/things/invitation/verbs/send.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

export default defineAction({
  description: "Invite someone to an organisation by email. (acme's invitation.send; open to organization.owner of its organization.)",
  schema: z.object({
    organization: z.string().startsWith("org_").describe("the invitation.organization"),
    email: z.string().max(254).describe("the invitation.email"),
  }),
  outputSchema: z.object({
    invitation: z.string().startsWith("inv_").describe("the invitation.id"),
  }),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"invitation.send","route":"invitation/send","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
