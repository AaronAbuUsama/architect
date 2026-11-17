// Generated from blueprint/things/mission/verbs/resume.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/mission/verbs/resume.ts";
import { MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("resume", "/mission/resume", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MissionNotIntake, NotAllowed],
});
export const steps = ["mission.resume.record"] as const;
