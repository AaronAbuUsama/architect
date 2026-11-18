// Generated from blueprint/things/membership/verbs/get.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

export default defineAction({
  description: "Read one membership by its id: organization, person, role. (acme's membership.get; open to membership.holder or organization.owner of its membership.organization.)",
  schema: z.object({
    id: z.string().startsWith("mem_").describe("the membership.id"),
  }),
  outputSchema: z.object({
    organization: z.string().startsWith("org_").describe("the membership.organization"),
    person: z.string().startsWith("per_").describe("the membership.person"),
    role: z.unknown().describe("Role; the membership.role"),
  }),
  errors,
  readOnly: true,
  retrySafe: true,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"membership.get","route":"membership/get","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
