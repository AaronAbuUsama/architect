// Generated from blueprint/things/link/verbs/remove.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/link/verbs/remove.ts";
import { LinkNotListed, LinkNotFound } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("remove", "/link/remove", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [LinkNotListed, LinkNotFound],
});
export const steps = ["link.remove.record"] as const;
