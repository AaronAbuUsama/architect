// Generated from blueprint/things/system/verbs/health.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/system/verbs/health.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("health", "/system/health", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: declaration.answerSchema,
  error: [],
});
export const steps = [] as const;
