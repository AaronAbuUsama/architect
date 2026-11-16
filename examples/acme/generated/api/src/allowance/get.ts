// Generated from blueprint/things/allowance/verbs/get.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/allowance/verbs/get.ts";
import { NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("get", "/allowance/get", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [NotAllowed],
});
export const steps = [] as const;
