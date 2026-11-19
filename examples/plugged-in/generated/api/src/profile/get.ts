// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/profile/verbs/get.ts";
import { ProfileNotFound } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/profile/get", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [ProfileNotFound],
});
export const steps = ["profile.get.load"] as const;
