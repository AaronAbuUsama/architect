// Generated from blueprint/things/attention/verbs/decline.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/attention/verbs/decline.ts";
import { AttentionNotOpen, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("decline", "/attention/decline", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [AttentionNotOpen, NotAllowed],
});
export const steps = ["attention.decline.record"] as const;
