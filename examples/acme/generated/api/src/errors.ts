// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "@architect/blueprint/server";
import * as Allowance from "../../../blueprint/things/allowance/errors.ts";

ErrorNames.name(Allowance.AllowanceExceeded, "AllowanceExceeded");
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", structOf(Allowance.AllowanceExceeded.fields).fields, { httpApiStatus: 422 }) {}
ErrorNames.name(Allowance.AllowanceLimitTooHigh, "AllowanceLimitTooHigh");
export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()("AllowanceLimitTooHigh", structOf(Allowance.AllowanceLimitTooHigh.fields).fields, { httpApiStatus: 422 }) {}
ErrorNames.name(Allowance.AllowanceNotFound, "AllowanceNotFound");
export class AllowanceNotFound extends Schema.TaggedError<AllowanceNotFound>()("AllowanceNotFound", structOf(Allowance.AllowanceNotFound.fields).fields, { httpApiStatus: 422 }) {}
export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", { state: Schema.String }, { httpApiStatus: 409 }) {}
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", {}, { httpApiStatus: 403 }) {}

/** Each refusal's exit code, for the CLI. */
export const exits = {
  AllowanceExceeded: 41,
  AllowanceLimitTooHigh: 44,
  AllowanceNotFound: 43,
  AllowanceNotActive: 40,
  NotAllowed: 3,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AllowanceExceeded, AllowanceLimitTooHigh, AllowanceNotFound, AllowanceNotActive, NotAllowed };
