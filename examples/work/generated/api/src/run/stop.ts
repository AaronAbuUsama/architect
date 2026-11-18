// Generated from blueprint/things/run/verbs/stop.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/run/verbs/stop.ts";
import { RunNotRunning, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("stop", "/run/stop", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [RunNotRunning, NotAllowed],
});
export const steps = ["run.stop.record"] as const;
