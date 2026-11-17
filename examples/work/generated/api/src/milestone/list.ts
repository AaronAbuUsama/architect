// Generated from blueprint/things/milestone/verbs/list.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/milestone/verbs/list.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("list", "/milestone/list", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = [] as const;
