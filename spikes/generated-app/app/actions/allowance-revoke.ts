// Generated from blueprint/things/allowance/verbs/revoke.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("AllowanceNotActive", "NotAllowed");

const answer = z.object({});

export default defineAction({
  description: "Stop an allowance. Nothing more can be spent from it. (acme's allowance.revoke; open to organization.owner of its allowance.organization.)",
  schema: z.object({
    allowance: z.string().startsWith("alw_").describe("the allowance.id"),
  }),
  outputSchema: answer,
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"allowance.revoke","route":"allowance/revoke","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
