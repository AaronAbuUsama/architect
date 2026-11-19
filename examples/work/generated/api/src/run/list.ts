// Generated from blueprint/things/run/verbs/list.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { listItemFields } from "orthograph/server";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/run/verbs/list.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("list", "/run/list", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer, listItemFields(declaration.thing)) as unknown as typeof declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = [] as const;
