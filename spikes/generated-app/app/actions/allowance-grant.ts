// Generated from blueprint/things/allowance/verbs/grant.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("AllowanceLimitTooHigh", "NotAllowed");

export default defineAction({
  description: "Let a member spend from the organisation, up to a limit each month. (acme's allowance.grant; open to organization.owner of its organization.)",
  schema: z.object({
    organization: z.string().startsWith("org_").describe("the allowance.organization"),
    member: z.string().startsWith("per_").describe("the allowance.member"),
    limit: z.string().regex(/^\d+$/).describe("Amount; the allowance.limit"),
  }),
  outputSchema: z.object({
    allowance: z.string().startsWith("alw_").describe("the allowance.id"),
  }),
  errors,
  readOnly: false,
  retrySafe: true, // idempotent: "request"; run sends the request key
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"allowance.grant","route":"allowance/grant","requestKey":true,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
