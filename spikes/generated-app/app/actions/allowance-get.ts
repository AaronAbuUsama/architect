// Generated from blueprint/things/allowance/verbs/get.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

const answer = z.object({
  organization: z.string().startsWith("org_").describe("the allowance.organization"),
  member: z.string().startsWith("per_").describe("the allowance.member"),
  limit: z.string().regex(/^\d+$/).describe("Amount; the allowance.limit"),
  spent: z.string().regex(/^\d+$/).describe("Amount; the allowance.spent"),
  state: z.string().max(64),
});

export default defineAction({
  description: "Read one allowance by its id: organization, member, limit, spent, state. (acme's allowance.get; open to allowance.grantee or organization.owner of its organization.)",
  schema: z.object({
    id: z.string().startsWith("alw_").describe("the allowance.id"),
  }),
  outputSchema: answer,
  errors,
  readOnly: true,
  retrySafe: true,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"allowance.get","route":"allowance/get","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
