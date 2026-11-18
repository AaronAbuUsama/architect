// Generated from blueprint/things/run/verbs/fail.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/run/verbs/fail.ts";
import { RunNotRunning, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("fail", "/run/fail", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [RunNotRunning, NotAllowed],
});
export const steps = ["run.fail.record"] as const;
