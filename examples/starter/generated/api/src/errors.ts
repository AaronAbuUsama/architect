// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "@architect/blueprint/server";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", structOf(Person.PersonEmailTaken.fields).fields, { httpApiStatus: 422 }) {}
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", structOf(Session.SessionCredentialsWrong.fields).fields, { httpApiStatus: 422 }) {}
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { state: Schema.String }, { httpApiStatus: 409 }) {}
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { state: Schema.String }, { httpApiStatus: 409 }) {}
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", {}, { httpApiStatus: 403 }) {}

/** Each refusal's exit code, for the CLI. */
export const exits = {
  PersonEmailTaken: 11,
  SessionCredentialsWrong: 10,
  InvitationNotPending: 40,
  OrganizationNotActive: 20,
  NotAllowed: 3,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { PersonEmailTaken, SessionCredentialsWrong, InvitationNotPending, OrganizationNotActive, NotAllowed };
