// Generated from the blueprint. Do not edit.
import { HttpApi, HttpApiGroup } from "effect/http-api";
import * as apiKeyCreate from "./api-key/create.ts";
import * as handleClaim from "./handle/claim.ts";
import * as handleRelease from "./handle/release.ts";
import * as handleResolve from "./handle/resolve.ts";
import * as invitationAccept from "./invitation/accept.ts";
import * as invitationRevoke from "./invitation/revoke.ts";
import * as invitationSend from "./invitation/send.ts";
import * as linkAdd from "./link/add.ts";
import * as linkOrder from "./link/order.ts";
import * as linkRemove from "./link/remove.ts";
import * as membershipGet from "./membership/get.ts";
import * as organizationCreate from "./organization/create.ts";
import * as organizationGet from "./organization/get.ts";
import * as personSignUp from "./person/sign-up.ts";
import * as profileGet from "./profile/get.ts";
import * as sessionShow from "./session/show.ts";
import * as sessionSignIn from "./session/sign-in.ts";
import * as systemHealth from "./system/health.ts";

export class ApiKey extends HttpApiGroup.make("api-key").add(apiKeyCreate.endpoint) {}
export class Handle extends HttpApiGroup.make("handle").add(handleClaim.endpoint).add(handleRelease.endpoint).add(handleResolve.endpoint) {}
export class Invitation extends HttpApiGroup.make("invitation").add(invitationAccept.endpoint).add(invitationRevoke.endpoint).add(invitationSend.endpoint) {}
export class Link extends HttpApiGroup.make("link").add(linkAdd.endpoint).add(linkOrder.endpoint).add(linkRemove.endpoint) {}
export class Membership extends HttpApiGroup.make("membership").add(membershipGet.endpoint) {}
export class Organization extends HttpApiGroup.make("organization").add(organizationCreate.endpoint).add(organizationGet.endpoint) {}
export class Person extends HttpApiGroup.make("person").add(personSignUp.endpoint) {}
export class Profile extends HttpApiGroup.make("profile").add(profileGet.endpoint) {}
export class Session extends HttpApiGroup.make("session").add(sessionShow.endpoint).add(sessionSignIn.endpoint) {}
export class System extends HttpApiGroup.make("system").add(systemHealth.endpoint) {}
export class Api extends HttpApi.make("starter").add(ApiKey).add(Handle).add(Invitation).add(Link).add(Membership).add(Organization).add(Person).add(Profile).add(Session).add(System) {}

export * as Errors from "./errors.ts";
export * as Events from "./events.ts";
export const operations = { "api-key.create": apiKeyCreate, "handle.claim": handleClaim, "handle.release": handleRelease, "handle.resolve": handleResolve, "invitation.accept": invitationAccept, "invitation.revoke": invitationRevoke, "invitation.send": invitationSend, "link.add": linkAdd, "link.order": linkOrder, "link.remove": linkRemove, "membership.get": membershipGet, "organization.create": organizationCreate, "organization.get": organizationGet, "person.sign-up": personSignUp, "profile.get": profileGet, "session.show": sessionShow, "session.sign-in": sessionSignIn, "system.health": systemHealth } as const;
