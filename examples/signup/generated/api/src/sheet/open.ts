// Generated from blueprint/things/sheet/verbs/open.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/sheet/verbs/open.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("open", "/sheet/open", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [],
});
export const steps = ["sheet.open.insert"] as const;
