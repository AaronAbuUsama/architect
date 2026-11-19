// Generated from blueprint/things/run/verbs/report.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/run/verbs/report.ts";
import { RunNotRunning, NotAllowed } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("report", "/run/report", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  // Typed as the declaration types it: the schema is built from fields known only at run time, which TypeScript cannot follow.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer) as unknown as typeof declaration.answerSchema,
  error: [RunNotRunning, NotAllowed],
});
export const steps = ["run.report.record"] as const;
