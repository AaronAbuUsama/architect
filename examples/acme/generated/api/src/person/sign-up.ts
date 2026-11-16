// Generated from blueprint/things/person/verbs/sign-up.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/person/verbs/sign-up.ts";
import { PersonEmailTaken } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("sign-up", "/person/sign-up", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [PersonEmailTaken],
});
export const steps = ["person.sign-up.create"] as const;
