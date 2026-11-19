// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames } from "orthograph/server";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import * as Sheet from "../../../blueprint/things/sheet/errors.ts";

ErrorNames.name(Sheet.SheetFull, "SheetFull");
export class SheetFull extends Schema.TaggedError<SheetFull>()("SheetFull", { code: Schema.Literal("SH-001"), ...Visibility.schema(Audience.principal(), Sheet.SheetFull.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "SH-001" as const; }
export class SheetNotOpen extends Schema.TaggedError<SheetNotOpen>()("SheetNotOpen", { code: Schema.Literal("SH-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "SH-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  SheetFull: 71,
  SheetNotOpen: 70,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  SheetFull: "SH-001",
  SheetNotOpen: "SH-900",
  NotAllowed: "AR-001",
} as const;

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  SheetFull: Sheet.SheetFull,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { SheetFull, SheetNotOpen, NotAllowed };
