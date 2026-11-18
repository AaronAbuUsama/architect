// Generated from blueprint/things/api-key/verbs/create.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

const answer = z.object({
  apiKey: z.string().startsWith("key_").describe("the api-key.id"),
  key: z.string().describe("Secret; secret: never shown, never logged"),
});

export default defineAction({
  description: "Create an API key in an organisation. The key itself is shown once. (acme's api-key.create; open to organization.owner of its organization.)",
  schema: z.object({
    organization: z.string().startsWith("org_").describe("the api-key.organization"),
    name: z.string().max(200).describe("the api-key.name"),
  }),
  outputSchema: answer,
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"api-key.create","route":"api-key/create","requestKey":false,"secret":{"payload":[],"answer":["key"]}}, args, ctx, errors),
});
