// Generated from blueprint/things/system/verbs/health.ts. Do not edit.
import { defineAction } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/forman/acme.ts";

export const errors = undefined;

const answer = z.object({
  status: z.unknown().describe("Ok"),
});

export default defineAction({
  description: "Is the application up? (acme's system.health; open to anyone.)",
  schema: z.object({}),
  outputSchema: answer,
  readOnly: false,
  retrySafe: false,
  needsApproval: false, // no .notVia(Via.agent) in the model yet (M2.01)
  run: (args, ctx) => acme.call<z.output<typeof answer>>({"operation":"system.health","route":"system/health","requestKey":false,"secret":{"payload":[],"answer":[]}}, args, ctx, errors),
});
