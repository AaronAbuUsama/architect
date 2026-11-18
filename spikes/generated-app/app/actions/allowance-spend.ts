// Generated from blueprint/things/allowance/verbs/spend.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("AllowanceExceeded", "AllowanceNotActive", "NotAllowed");

const answer = z.object({
  remaining: z.string().regex(/^\d+$/).describe("Amount"),
});

export default defineAction({
  description: "Spend from what is left of this month's allowance. (acme's allowance.spend; open to allowance.grantee.)",
  schema: z.object({
    allowance: z.string().startsWith("alw_").describe("the allowance.id"),
    amount: z.string().regex(/^\d+$/).describe("Amount"),
    memo: z.string().max(200).describe("Memo"),
  }),
  outputSchema: answer,
  errors,
  readOnly: false,
  retrySafe: true, // idempotent: "request"; run sends the request key
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"allowance.spend","route":"allowance/spend","requestKey":true,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
