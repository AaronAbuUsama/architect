// Generated from blueprint/things/mission/verbs/finish.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/mission/verbs/finish.ts";
import { MissionHasOpenTasks, MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("finish", "/mission/finish", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [MissionHasOpenTasks, MissionNotIntake, NotAllowed],
});
export const steps = ["mission.finish.record"] as const;
