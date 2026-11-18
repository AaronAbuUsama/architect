// Generated from blueprint/things/sheet/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/sheet/verbs/get.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/sheet/get", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [],
});
export const steps = [] as const;
