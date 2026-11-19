// Generated from blueprint/things/sheet/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/sheet/verbs/get.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/sheet/get", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [],
});
export const steps = [] as const;
