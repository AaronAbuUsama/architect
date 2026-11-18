// Generated from blueprint/things/organization/verbs/create.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

const answer = z.object({
  organization: z.string().startsWith("org_").describe("the organization.id"),
});

export default defineAction({
  description: "Found an organisation with its cap. Whoever founds it owns it, and is its first member. (acme's organization.create; open to signed-in.)",
  schema: z.object({
    name: z.string().max(200).describe("the organization.name"),
    cap: z.string().regex(/^\d+$/).describe("Amount; the organization.cap"),
  }),
  outputSchema: answer,
  errors,
  readOnly: false,
  retrySafe: true, // idempotent: "request"; run sends the request key
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"organization.create","route":"organization/create","requestKey":true,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
