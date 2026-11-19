// Generated from blueprint/things/sheet/verbs/close.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/sheet/verbs/close.ts";
import { SheetNotOpen, SheetNotFound } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("close", "/sheet/close", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [SheetNotOpen, SheetNotFound],
});
export const steps = ["sheet.close.record"] as const;
