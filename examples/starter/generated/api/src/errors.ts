// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "orthograph/server";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  PersonEmailTaken: { code: "PE-001", exit: 11, status: 422 },
  SessionCredentialsWrong: { code: "SE-001", exit: 10, status: 422 },
  InvitationNotPending: { code: "IN-900", exit: 40, status: 409 },
  OrganizationNotActive: { code: "OR-900", exit: 20, status: 409 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal(refusals.PersonEmailTaken.code), ...structOf(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: refusals.PersonEmailTaken.status }) { static readonly code = refusals.PersonEmailTaken.code; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal(refusals.SessionCredentialsWrong.code), ...structOf(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: refusals.SessionCredentialsWrong.status }) { static readonly code = refusals.SessionCredentialsWrong.code; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal(refusals.InvitationNotPending.code), ...{ state: Schema.String } }, { httpApiStatus: refusals.InvitationNotPending.status }) { static readonly code = refusals.InvitationNotPending.code; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal(refusals.OrganizationNotActive.code), ...{ state: Schema.String } }, { httpApiStatus: refusals.OrganizationNotActive.status }) { static readonly code = refusals.OrganizationNotActive.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */
export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {
  PersonEmailTaken: [],
  SessionCredentialsWrong: [],
  InvitationNotPending: ["state"],
  OrganizationNotActive: ["state"],
  NotAllowed: [],
};

/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */
export const declared = {
  PersonEmailTaken: Person.PersonEmailTaken,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { PersonEmailTaken, SessionCredentialsWrong, InvitationNotPending, OrganizationNotActive, NotAllowed };
