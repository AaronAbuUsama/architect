// Generated from blueprint/things/milestone/verbs/drop.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/milestone/verbs/drop.ts";
import { MilestoneNotActive, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("drop", "/milestone/drop", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MilestoneNotActive, NotAllowed],
});
export const steps = ["milestone.drop.record"] as const;
