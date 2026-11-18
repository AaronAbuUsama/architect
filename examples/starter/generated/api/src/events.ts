// Generated from the blueprint. Do not edit.
import { EventNames } from "orthograph/server";
import * as Invitation from "../../../blueprint/things/invitation/events.ts";
import * as Organization from "../../../blueprint/things/organization/events.ts";

EventNames.name(Invitation.InvitationAccepted, "InvitationAccepted");
EventNames.name(Invitation.InvitationRevoked, "InvitationRevoked");
EventNames.name(Invitation.InvitationSent, "InvitationSent");
EventNames.name(Organization.OrganizationCreated, "OrganizationCreated");

export const names = ["InvitationAccepted", "InvitationRevoked", "InvitationSent", "OrganizationCreated"] as const;
