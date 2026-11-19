// Generated from blueprint/things/milestone/verbs/list.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { listItemFields } from "orthograph/server";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/milestone/verbs/list.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("list", "/milestone/list", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer, listItemFields(declaration.thing)),
  error: [NotAllowed],
});
export const steps = [] as const;
