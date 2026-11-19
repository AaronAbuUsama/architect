// Generated from blueprint/things/link/verbs/add.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/link/verbs/add.ts";
import { LinkNeedsHandle, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("add", "/link/add", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [LinkNeedsHandle, NotAllowed],
});
export const steps = ["link.add.load", "link.add.record"] as const;
