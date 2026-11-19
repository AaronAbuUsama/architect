// Generated from blueprint/things/mission/verbs/start.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/mission/verbs/start.ts";
import { MissionHasOpenQuestions, MissionNotIntake, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("start", "/mission/start", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer) as unknown as typeof declaration.answerSchema,
  error: [MissionHasOpenQuestions, MissionNotIntake, NotAllowed],
});
export const steps = ["mission.start.record"] as const;
