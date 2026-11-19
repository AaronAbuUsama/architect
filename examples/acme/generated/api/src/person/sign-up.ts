// Generated from blueprint/things/person/verbs/sign-up.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/person/verbs/sign-up.ts";
import { PersonEmailTaken } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("sign-up", "/person/sign-up", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [PersonEmailTaken],
});
export const steps = ["person.sign-up.create"] as const;
