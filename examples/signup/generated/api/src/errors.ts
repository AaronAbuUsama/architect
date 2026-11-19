// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "orthograph/server";
import * as Sheet from "../../../blueprint/things/sheet/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  SheetFull: { code: "SH-001", exit: 71, status: 422 },
  SheetNotOpen: { code: "SH-900", exit: 70, status: 409 },
  SheetNotFound: { code: "SH-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Sheet.SheetFull, "SheetFull");
export class SheetFull extends Schema.TaggedError<SheetFull>()("SheetFull", { code: Schema.Literal(refusals.SheetFull.code), ...structOf(Sheet.SheetFull.fields).fields }, { httpApiStatus: refusals.SheetFull.status }) { static readonly code = refusals.SheetFull.code; }
export class SheetNotOpen extends Schema.TaggedError<SheetNotOpen>()("SheetNotOpen", { code: Schema.Literal(refusals.SheetNotOpen.code), ...{ state: Schema.String } }, { httpApiStatus: refusals.SheetNotOpen.status }) { static readonly code = refusals.SheetNotOpen.code; }
export class SheetNotFound extends Schema.TaggedError<SheetNotFound>()("SheetNotFound", { code: Schema.Literal(refusals.SheetNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.SheetNotFound.status }) { static readonly code = refusals.SheetNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */
export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {
  SheetFull: ["left"],
  SheetNotOpen: ["state"],
  SheetNotFound: ["id"],
  NotAllowed: [],
};

/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */
export const declared = {
  SheetFull: Sheet.SheetFull,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { SheetFull, SheetNotOpen, SheetNotFound, NotAllowed };
