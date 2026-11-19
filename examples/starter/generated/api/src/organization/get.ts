// Generated from blueprint/things/organization/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/organization/verbs/get.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/organization/get", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [NotAllowed],
});
export const steps = [] as const;
