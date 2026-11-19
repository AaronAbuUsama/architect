// Generated from blueprint/things/sheet/verbs/open.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/sheet/verbs/open.ts";
import {  } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("open", "/sheet/open", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [],
});
export const steps = ["sheet.open.insert"] as const;
