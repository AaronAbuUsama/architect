// Generated from blueprint/things/attention/verbs/raise.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/attention/verbs/raise.ts";
import { MissionNotRunning, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("raise", "/attention/raise", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [MissionNotRunning, NotAllowed],
});
export const steps = ["attention.raise.insert"] as const;
