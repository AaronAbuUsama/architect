// Generated from blueprint/things/event/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/event/verbs/get.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/event/get", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [],
});
export const steps = [] as const;
