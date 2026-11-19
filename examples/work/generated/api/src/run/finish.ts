// Generated from blueprint/things/run/verbs/finish.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/run/verbs/finish.ts";
import { RunNotRunning, RunNotFound, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("finish", "/run/finish", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [RunNotRunning, RunNotFound, NotAllowed],
});
export const steps = ["run.finish.record"] as const;
