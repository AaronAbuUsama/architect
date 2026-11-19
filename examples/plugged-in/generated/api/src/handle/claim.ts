// Generated from blueprint/things/handle/verbs/claim.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/handle/verbs/claim.ts";
import { HandleTaken, HandleAlreadyOwned, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("claim", "/handle/claim", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [HandleTaken, HandleAlreadyOwned, NotAllowed],
});
export const steps = ["handle.claim.load", "handle.claim.record"] as const;
