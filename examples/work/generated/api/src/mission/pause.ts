// Generated from blueprint/things/mission/verbs/pause.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/mission/verbs/pause.ts";
import { MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("pause", "/mission/pause", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MissionNotIntake, NotAllowed],
});
export const steps = ["mission.pause.record"] as const;
