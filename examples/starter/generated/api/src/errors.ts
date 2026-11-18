// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, structOf } from "orthograph/server";
import * as Handle from "../../../blueprint/things/handle/errors.ts";
import * as Link from "../../../blueprint/things/link/errors.ts";
import * as Person from "../../../blueprint/things/person/errors.ts";
import * as Profile from "../../../blueprint/things/profile/errors.ts";
import * as Session from "../../../blueprint/things/session/errors.ts";

ErrorNames.name(Handle.HandleTaken, "HandleTaken");
export class HandleTaken extends Schema.TaggedError<HandleTaken>()("HandleTaken", { code: Schema.Literal("HN-001"), ...structOf(Handle.HandleTaken.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "HN-001" as const; }
ErrorNames.name(Handle.HandleAlreadyOwned, "HandleAlreadyOwned");
export class HandleAlreadyOwned extends Schema.TaggedError<HandleAlreadyOwned>()("HandleAlreadyOwned", { code: Schema.Literal("HN-002"), ...structOf(Handle.HandleAlreadyOwned.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "HN-002" as const; }
ErrorNames.name(Handle.HandleNotFound, "HandleNotFound");
export class HandleNotFound extends Schema.TaggedError<HandleNotFound>()("HandleNotFound", { code: Schema.Literal("HN-003"), ...structOf(Handle.HandleNotFound.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "HN-003" as const; }
ErrorNames.name(Link.LinkNeedsHandle, "LinkNeedsHandle");
export class LinkNeedsHandle extends Schema.TaggedError<LinkNeedsHandle>()("LinkNeedsHandle", { code: Schema.Literal("LI-001"), ...structOf(Link.LinkNeedsHandle.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "LI-001" as const; }
ErrorNames.name(Link.LinkAlreadyRemoved, "LinkAlreadyRemoved");
export class LinkAlreadyRemoved extends Schema.TaggedError<LinkAlreadyRemoved>()("LinkAlreadyRemoved", { code: Schema.Literal("LI-002"), ...structOf(Link.LinkAlreadyRemoved.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "LI-002" as const; }
ErrorNames.name(Person.PersonEmailTaken, "PersonEmailTaken");
export class PersonEmailTaken extends Schema.TaggedError<PersonEmailTaken>()("PersonEmailTaken", { code: Schema.Literal("PE-001"), ...structOf(Person.PersonEmailTaken.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "PE-001" as const; }
ErrorNames.name(Profile.ProfileNotFound, "ProfileNotFound");
export class ProfileNotFound extends Schema.TaggedError<ProfileNotFound>()("ProfileNotFound", { code: Schema.Literal("PR-001"), ...structOf(Profile.ProfileNotFound.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "PR-001" as const; }
ErrorNames.name(Session.SessionCredentialsWrong, "SessionCredentialsWrong");
export class SessionCredentialsWrong extends Schema.TaggedError<SessionCredentialsWrong>()("SessionCredentialsWrong", { code: Schema.Literal("SE-001"), ...structOf(Session.SessionCredentialsWrong.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "SE-001" as const; }
export class HandleNotClaimed extends Schema.TaggedError<HandleNotClaimed>()("HandleNotClaimed", { code: Schema.Literal("HN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "HN-900" as const; }
export class InvitationNotPending extends Schema.TaggedError<InvitationNotPending>()("InvitationNotPending", { code: Schema.Literal("IN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "IN-900" as const; }
export class LinkNotListed extends Schema.TaggedError<LinkNotListed>()("LinkNotListed", { code: Schema.Literal("LI-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "LI-900" as const; }
export class OrganizationNotActive extends Schema.TaggedError<OrganizationNotActive>()("OrganizationNotActive", { code: Schema.Literal("OR-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "OR-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  HandleTaken: 3,
  HandleAlreadyOwned: 4,
  HandleNotFound: 6,
  LinkNeedsHandle: 4,
  LinkAlreadyRemoved: 6,
  PersonEmailTaken: 11,
  ProfileNotFound: 6,
  SessionCredentialsWrong: 10,
  HandleNotClaimed: 5,
  InvitationNotPending: 40,
  LinkNotListed: 5,
  OrganizationNotActive: 20,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  HandleTaken: "HN-001",
  HandleAlreadyOwned: "HN-002",
  HandleNotFound: "HN-003",
  LinkNeedsHandle: "LI-001",
  LinkAlreadyRemoved: "LI-002",
  PersonEmailTaken: "PE-001",
  ProfileNotFound: "PR-001",
  SessionCredentialsWrong: "SE-001",
  HandleNotClaimed: "HN-900",
  InvitationNotPending: "IN-900",
  LinkNotListed: "LI-900",
  OrganizationNotActive: "OR-900",
  NotAllowed: "AR-001",
} as const;

/** The fields of each refusal whose values may be shown (printed, logged, put in a span): only the public ones. */
export const shown: Readonly<Record<string, ReadonlyArray<string>>> = {
  HandleTaken: [],
  HandleAlreadyOwned: [],
  HandleNotFound: [],
  LinkNeedsHandle: [],
  LinkAlreadyRemoved: [],
  PersonEmailTaken: [],
  ProfileNotFound: [],
  SessionCredentialsWrong: [],
  HandleNotClaimed: ["state"],
  InvitationNotPending: ["state"],
  LinkNotListed: ["state"],
  OrganizationNotActive: ["state"],
  NotAllowed: [],
};

/** The declared errors themselves, by name: their fields say who may see a value (the MCP server redacts by role). */
export const declared = {
  HandleTaken: Handle.HandleTaken,
  HandleAlreadyOwned: Handle.HandleAlreadyOwned,
  HandleNotFound: Handle.HandleNotFound,
  LinkNeedsHandle: Link.LinkNeedsHandle,
  LinkAlreadyRemoved: Link.LinkAlreadyRemoved,
  PersonEmailTaken: Person.PersonEmailTaken,
  ProfileNotFound: Profile.ProfileNotFound,
  SessionCredentialsWrong: Session.SessionCredentialsWrong,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { HandleTaken, HandleAlreadyOwned, HandleNotFound, LinkNeedsHandle, LinkAlreadyRemoved, PersonEmailTaken, ProfileNotFound, SessionCredentialsWrong, HandleNotClaimed, InvitationNotPending, LinkNotListed, OrganizationNotActive, NotAllowed };
