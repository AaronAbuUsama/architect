// Generated from blueprint/things/session/verbs/show.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = defineActionErrors("NotAllowed");

export default defineAction({
  description: "Who is signed in. (acme's session.show; open to signed-in.)",
  schema: z.object({}),
  outputSchema: z.object({
    person: z.string().startsWith("per_").describe("the person.id"),
    email: z.string().max(254).describe("the person.email"),
  }),
  errors,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call({"operation":"session.show","route":"session/show","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
