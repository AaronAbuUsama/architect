// Generated from blueprint/things/mission/verbs/start.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/mission/verbs/start.ts";
import { MissionHasOpenQuestions, MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("start", "/mission/start", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MissionHasOpenQuestions, MissionNotIntake, NotAllowed],
});
export const steps = ["mission.start.record"] as const;
