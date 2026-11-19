// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal("PE-001"), ...wireStruct(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "PE-001" as const; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal("SE-001"), ...wireStruct(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "SE-001" as const; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal("IN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "IN-900" as const; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal("OR-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "OR-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  PersonEmailTaken: 11,
  SessionCredentialsWrong: 10,
  InvitationNotPending: 40,
  OrganizationNotActive: 20,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  PersonEmailTaken: "PE-001",
  SessionCredentialsWrong: "SE-001",
  InvitationNotPending: "IN-900",
  OrganizationNotActive: "OR-900",
  NotAllowed: "AR-001",
} as const;

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  PersonEmailTaken: Person.PersonEmailTaken,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { PersonEmailTaken, SessionCredentialsWrong, InvitationNotPending, OrganizationNotActive, NotAllowed };
