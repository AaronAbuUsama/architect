// Generated from blueprint/projections/api.ts. Do not edit.
import { Schema } from "effect";
import { ErrorNames } from "orthograph/server";
import { Audience, Visibility } from "@orthograph/language-effect/visibility";
import * as Handle from "../../../blueprint/things/handle/errors.ts";
import * as Link from "../../../blueprint/things/link/errors.ts";
import * as Profile from "../../../blueprint/things/profile/errors.ts";

ErrorNames.name(Handle.HandleTaken, "HandleTaken");
export class HandleTaken extends Schema.TaggedError<HandleTaken>()("HandleTaken", { code: Schema.Literal("HN-001"), ...Visibility.schema(Audience.principal(), Handle.HandleTaken.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "HN-001" as const; }
ErrorNames.name(Link.LinkNeedsHandle, "LinkNeedsHandle");
export class LinkNeedsHandle extends Schema.TaggedError<LinkNeedsHandle>()("LinkNeedsHandle", { code: Schema.Literal("LN-001"), ...Visibility.schema(Audience.principal(), Link.LinkNeedsHandle.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "LN-001" as const; }
ErrorNames.name(Link.LinkAlreadyRemoved, "LinkAlreadyRemoved");
export class LinkAlreadyRemoved extends Schema.TaggedError<LinkAlreadyRemoved>()("LinkAlreadyRemoved", { code: Schema.Literal("LN-002"), ...Visibility.schema(Audience.principal(), Link.LinkAlreadyRemoved.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "LN-002" as const; }
ErrorNames.name(Profile.ProfileNotFound, "ProfileNotFound");
export class ProfileNotFound extends Schema.TaggedError<ProfileNotFound>()("ProfileNotFound", { code: Schema.Literal("PR-001"), ...Visibility.schema(Audience.principal(), Profile.ProfileNotFound.fields).fields }, { httpApiStatus: 422 }) { static readonly code = "PR-001" as const; }
export class HandleNotClaimed extends Schema.TaggedError<HandleNotClaimed>()("HandleNotClaimed", { code: Schema.Literal("HN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "HN-900" as const; }
export class LinkNotListed extends Schema.TaggedError<LinkNotListed>()("LinkNotListed", { code: Schema.Literal("LN-900"), ...{ state: Schema.String } }, { httpApiStatus: 409 }) { static readonly code = "LN-900" as const; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal("AR-001"), ...{} }, { httpApiStatus: 403 }) { static readonly code = "AR-001" as const; }

/** Each refusal's exit code, for the CLI. */
export const exits = {
  HandleTaken: 10,
  LinkNeedsHandle: 30,
  LinkAlreadyRemoved: 32,
  ProfileNotFound: 20,
  HandleNotClaimed: 11,
  LinkNotListed: 31,
  NotAllowed: 3,
} as const;

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. */
export const codes = {
  HandleTaken: "HN-001",
  LinkNeedsHandle: "LN-001",
  LinkAlreadyRemoved: "LN-002",
  ProfileNotFound: "PR-001",
  HandleNotClaimed: "HN-900",
  LinkNotListed: "LN-900",
  NotAllowed: "AR-001",
} as const;

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  HandleTaken: Handle.HandleTaken,
  LinkNeedsHandle: Link.LinkNeedsHandle,
  LinkAlreadyRemoved: Link.LinkAlreadyRemoved,
  ProfileNotFound: Profile.ProfileNotFound,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { HandleTaken, LinkNeedsHandle, LinkAlreadyRemoved, ProfileNotFound, HandleNotClaimed, LinkNotListed, NotAllowed };
