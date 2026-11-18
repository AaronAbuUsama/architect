// Generated from blueprint/things/organization/verbs/get.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

export default defineAction({
  description: "Read one organization by its id: name, owner, state. (acme's organization.get; open to organization.owner.)",
  schema: z.object({
    id: z.string().startsWith("org_").describe("the organization.id"),
  }),
  outputSchema: z.object({
    name: z.string().max(200).describe("the organization.name"),
    owner: z.string().startsWith("per_").describe("the organization.owner"),
    state: z.string().max(64),
  }),
  errors,
  readOnly: true,
  retrySafe: true,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"organization.get","route":"organization/get","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
