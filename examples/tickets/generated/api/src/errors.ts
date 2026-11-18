// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "orthograph/server";
import * as Event from "../../../blueprint/things/event/errors.ts";

ErrorNames.name(Event.SoldOut, "SoldOut");
export class SoldOut extends Schema.TaggedError<SoldOut>()("SoldOut", { code: Schema.Literal("EV-001"), ...structOf(Event.SoldOut.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "EV-001" as const; }
export class EventNotOnSale extends Schema.TaggedError<EventNotOnSale>()("EventNotOnSale", { code: Schema.Literal("EV-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "EV-900" as const; }
export class TicketNotIssued extends Schema.TaggedError<TicketNotIssued>()("TicketNotIssued", { code: Schema.Literal("TI-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "TI-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  SoldOut: 71,
  EventNotOnSale: 70,
  TicketNotIssued: 72,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across languages: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  SoldOut: "EV-001",
  EventNotOnSale: "EV-900",
  TicketNotIssued: "TI-900",
  NotAllowed: "AR-001",
} as const;

/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */
export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {
  SoldOut: ["left"],
  EventNotOnSale: ["state"],
  TicketNotIssued: ["state"],
  NotAllowed: [],
};

/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */
export const declared = {
  SoldOut: Event.SoldOut,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { SoldOut, EventNotOnSale, TicketNotIssued, NotAllowed };
