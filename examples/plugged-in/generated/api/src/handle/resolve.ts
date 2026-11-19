// Generated from blueprint/things/handle/verbs/resolve.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/handle/verbs/resolve.ts";
import { HandleNotFound } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("resolve", "/handle/resolve", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [HandleNotFound],
});
export const steps = ["handle.resolve.load"] as const;
