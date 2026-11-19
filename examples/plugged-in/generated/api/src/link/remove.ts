// Generated from blueprint/things/link/verbs/remove.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/link/verbs/remove.ts";
import { LinkNotListed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("remove", "/link/remove", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer) as unknown as typeof declaration.answerSchema,
  error: [LinkNotListed],
});
export const steps = ["link.remove.record"] as const;
