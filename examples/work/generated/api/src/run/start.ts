// Generated from blueprint/things/run/verbs/start.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/run/verbs/start.ts";
import { MissionNotRunning, RunOverBudget, RunAgentCannot, RunTaskClaimed, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("start", "/run/start", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [MissionNotRunning, RunOverBudget, RunAgentCannot, RunTaskClaimed, NotAllowed],
});
export const steps = ["run.start.claim"] as const;
