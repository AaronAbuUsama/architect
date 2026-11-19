// Generated from blueprint/things/handle/verbs/release.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/handle/verbs/release.ts";
import { HandleNotClaimed, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("release", "/handle/release", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [HandleNotClaimed, NotAllowed],
});
export const steps = ["handle.release.record"] as const;
