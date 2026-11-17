// Generated from blueprint/things/run/verbs/start.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/run/verbs/start.ts";
import { RunOverBudget, RunAgentCannot, RunTaskClaimed, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("start", "/run/start", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [RunOverBudget, RunAgentCannot, RunTaskClaimed, NotAllowed],
});
export const steps = ["run.start.claim"] as const;
