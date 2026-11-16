// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "@architect/blueprint/server";
import * as Allowance from "../../../blueprint/things/allowance/errors.ts";

ErrorNames.name(Allowance.AllowanceLimitTooHigh, "AllowanceLimitTooHigh");
export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()("AllowanceLimitTooHigh", structOf(Allowance.AllowanceLimitTooHigh.fields).fields, { httpApiStatus: 422 }) {}
export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", { state: Schema.String }, { httpApiStatus: 409 }) {}
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", {}, { httpApiStatus: 403 }) {}

/** Each refusal's exit code, for the CLI. */
export const exits = {
  AllowanceLimitTooHigh: 44,
  AllowanceNotActive: 40,
  NotAllowed: 3,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AllowanceLimitTooHigh, AllowanceNotActive, NotAllowed };
