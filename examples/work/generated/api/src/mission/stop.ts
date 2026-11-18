// Generated from blueprint/things/mission/verbs/stop.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/mission/verbs/stop.ts";
import { MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("stop", "/mission/stop", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MissionNotIntake, NotAllowed],
});
export const steps = ["mission.stop.record"] as const;
