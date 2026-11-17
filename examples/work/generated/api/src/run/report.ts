// Generated from blueprint/things/run/verbs/report.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/run/verbs/report.ts";
import { RunNotRunning, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("report", "/run/report", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [RunNotRunning, NotAllowed],
});
export const steps = ["run.report.record"] as const;
