// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as Handle from "../../../blueprint/things/handle/events.ts";
import * as Invitation from "../../../blueprint/things/invitation/events.ts";
import * as Link from "../../../blueprint/things/link/events.ts";
import * as Organization from "../../../blueprint/things/organization/events.ts";

EventNames.name(Handle.HandleClaimed, "HandleClaimed");
EventNames.name(Handle.HandleReleased, "HandleReleased");
EventNames.name(Invitation.InvitationAccepted, "InvitationAccepted");
EventNames.name(Invitation.InvitationRevoked, "InvitationRevoked");
EventNames.name(Invitation.InvitationSent, "InvitationSent");
EventNames.name(Link.LinkAdded, "LinkAdded");
EventNames.name(Link.LinkRemoved, "LinkRemoved");
EventNames.name(Organization.OrganizationCreated, "OrganizationCreated");

export const names = ["HandleClaimed", "HandleReleased", "InvitationAccepted", "InvitationRevoked", "InvitationSent", "LinkAdded", "LinkRemoved", "OrganizationCreated"] as const;
