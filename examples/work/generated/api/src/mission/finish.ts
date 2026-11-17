// Generated from blueprint/things/mission/verbs/finish.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/mission/verbs/finish.ts";
import { MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("finish", "/mission/finish", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [MissionNotIntake, NotAllowed],
});
export const steps = ["mission.finish.record"] as const;
