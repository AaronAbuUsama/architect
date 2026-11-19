// Generated from blueprint/things/sheet/verbs/close.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import declaration from "../../../../blueprint/things/sheet/verbs/close.ts";
import { SheetNotOpen } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("close", "/sheet/close", {
  payload: declaration.payloadSchema,
  // What the wire carries: the declared answer, the fields not every caller is shown optional. The server cuts each answer by who is asking.
  success: Visibility.schema(Audience.principal([], { issuing: true }), declaration.answer),
  error: [SheetNotOpen],
});
export const steps = ["sheet.close.record"] as const;
