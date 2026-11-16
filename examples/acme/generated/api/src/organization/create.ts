// Generated from blueprint/things/organization/verbs/create.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/organization/verbs/create.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("create", "/organization/create", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = ["organization.create.insert"] as const;
