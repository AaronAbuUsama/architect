// Generated from blueprint/projections/api.ts. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "orthograph/server";
import * as Allowance from "../../../blueprint/things/allowance/errors.ts";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

ErrorNames.name(Allowance.AllowanceExceeded, "AllowanceExceeded");
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", { code: Schema.Literal("AL-001"), ...structOf(Allowance.AllowanceExceeded.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "AL-001" as const; }
ErrorNames.name(Allowance.AllowanceNotFound, "AllowanceNotFound");
export class AllowanceNotFound extends Schema.TaggedError<AllowanceNotFound>()("AllowanceNotFound", { code: Schema.Literal("AL-002"), ...structOf(Allowance.AllowanceNotFound.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "AL-002" as const; }
ErrorNames.name(Allowance.AllowanceLimitTooHigh, "AllowanceLimitTooHigh");
export class AllowanceLimitTooHigh extends Schema.TaggedError<AllowanceLimitTooHigh>()("AllowanceLimitTooHigh", { code: Schema.Literal("AL-003"), ...structOf(Allowance.AllowanceLimitTooHigh.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "AL-003" as const; }
ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal("PE-001"), ...structOf(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "PE-001" as const; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal("SE-001"), ...structOf(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "SE-001" as const; }
export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", { code: Schema.Literal("AL-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "AL-900" as const; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal("IN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "IN-900" as const; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal("OR-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "OR-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  AllowanceExceeded: 41,
  AllowanceNotFound: 43,
  AllowanceLimitTooHigh: 44,
  PersonEmailTaken: 11,
  SessionCredentialsWrong: 10,
  AllowanceNotActive: 40,
  InvitationNotPending: 40,
  OrganizationNotActive: 20,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  AllowanceExceeded: "AL-001",
  AllowanceNotFound: "AL-002",
  AllowanceLimitTooHigh: "AL-003",
  PersonEmailTaken: "PE-001",
  SessionCredentialsWrong: "SE-001",
  AllowanceNotActive: "AL-900",
  InvitationNotPending: "IN-900",
  OrganizationNotActive: "OR-900",
  NotAllowed: "AR-001",
} as const;

/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */
export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {
  AllowanceExceeded: ["remaining"],
  AllowanceNotFound: [],
  AllowanceLimitTooHigh: ["cap"],
  PersonEmailTaken: [],
  SessionCredentialsWrong: [],
  AllowanceNotActive: ["state"],
  InvitationNotPending: ["state"],
  OrganizationNotActive: ["state"],
  NotAllowed: [],
};

/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */
export const declared = {
  AllowanceExceeded: Allowance.AllowanceExceeded,
  AllowanceNotFound: Allowance.AllowanceNotFound,
  AllowanceLimitTooHigh: Allowance.AllowanceLimitTooHigh,
  PersonEmailTaken: Person.PersonEmailTaken,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AllowanceExceeded, AllowanceNotFound, AllowanceLimitTooHigh, PersonEmailTaken, SessionCredentialsWrong, AllowanceNotActive, InvitationNotPending, OrganizationNotActive, NotAllowed };
