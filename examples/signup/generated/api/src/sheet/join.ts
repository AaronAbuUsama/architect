// Generated from blueprint/things/sheet/verbs/join.ts. Do not edit.
import { HttpApiEndpoint } from "effect/http-api";
import declaration from "../../../../blueprint/things/sheet/verbs/join.ts";
import { SheetFull, SheetNotOpen } from "../errors.ts";

export { declaration };
export const endpoint = HttpApiEndpoint.post("join", "/sheet/join", {
  payload: declaration.payloadSchema,
  success: declaration.answerSchema,
  error: [SheetFull, SheetNotOpen],
});
export const steps = ["sheet.join.load", "sheet.join.record"] as const;
