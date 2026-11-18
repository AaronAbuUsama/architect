// Generated from blueprint/things/event/verbs/open.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/event/verbs/open.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("open", "/event/open", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [],
});
export const steps = ["event.open.insert"] as const;
