// Generated from blueprint/things/profile/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/profile/verbs/get.ts";
import { ProfileNotFound } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/profile/get", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer) as unknown as typeof declaration.answerSchema,
  error: [ProfileNotFound],
});
export const steps = ["profile.get.load"] as const;
