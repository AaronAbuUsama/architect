// Journey-author file. The builder of invitation.send, invitation.accept, invitation.revoke, membership.get,
// organization.get and session.show never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "@architect/blueprint";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine as organization } from "../blueprint/things/organization/machine.ts";
import { machine as invitation } from "../blueprint/things/invitation/machine.ts";
import { InvitationAccepted, InvitationRevoked, InvitationSent } from "../blueprint/things/invitation/events.ts";
import show from "../blueprint/things/session/verbs/show.ts";
import getOrganization from "../blueprint/things/organization/verbs/get.ts";
import getMembership from "../blueprint/things/membership/verbs/get.ts";
import send from "../blueprint/things/invitation/verbs/send.ts";
import accept from "../blueprint/things/invitation/verbs/accept.ts";
import revoke from "../blueprint/things/invitation/verbs/revoke.ts";

// `s.last` in a payload is the answer of the latest call that succeeded; a refused call leaves it alone.
export default Blueprint.journey("invite and accept", {
  // ada owns the organisation; olga is the invitee; bob is a signed-in outsider.
  cast: { ada: owner, olga: Blueprint.signedIn, bob: Blueprint.signedIn },
  starts: "founded",
  steps: (s) => [
    s.step(
      "ada sees who she is signed in as",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      expect((a) => a.email).toBe(s.ada.email),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
    s.step(
      "ada reads her organisation",
      s.ada.run(getOrganization, { id: s.world.organization }),
      expect((a) => a.name).toBe("Acme Demo"),
      expect((a) => a.owner).toBe(s.ada.person),
      expect((a) => a.state).toBe("active"),
      organization.isIn(s.world.organization, "active"),
      noEvents(),
    ),
    s.step(
      "bob can't invite anyone to it",
      s.bob.run(send, { organization: s.world.organization, email: s.olga.email }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "ada invites olga by her email",
      s.ada.run(send, { organization: s.world.organization, email: s.olga.email }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      emits(InvitationSent, { invitation: s.last.invitation, email: s.olga.email }),
      invitation.isIn(s.last.invitation, "pending"),
      spans({ present: ["invitation.send", "invitation.send.insert"] }),
    ),
    s.step(
      "bob can't accept olga's invitation",
      s.bob.run(accept, { invitation: s.last.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      invitation.isIn(s.last.invitation, "pending"),
      spans({ absent: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "olga accepts and joins ada's organisation",
      s.olga.run(accept, { invitation: s.last.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { membership: s.last.membership }),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "bob can't read olga's membership",
      s.bob.run(getMembership, { id: s.last.membership }),
      refuses(Blueprint.NotAllowed),
    ),
    s.step(
      "olga reads her membership: she is a member, not an owner",
      s.olga.run(getMembership, { id: s.last.membership }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.person).toBe(s.olga.person),
      expect((a) => a.role).toBe("member"),
      noEvents(),
    ),
    s.step(
      "ada sends a second invitation",
      s.ada.run(send, { organization: s.world.organization, email: s.bob.email }),
      expect((a) => a.invitation).toMatch(/^inv_[0-9a-z]+$/),
      emits(InvitationSent, { invitation: s.last.invitation, email: s.bob.email }),
      invitation.isIn(s.last.invitation, "pending"),
    ),
    s.step(
      "olga, a member but not the owner, can't revoke it",
      s.olga.run(revoke, { invitation: s.last.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
    s.step(
      "ada revokes it",
      s.ada.run(revoke, { invitation: s.last.invitation }),
      emits(InvitationRevoked, {}),
      spans({ present: ["invitation.revoke", "invitation.revoke.update"] }),
    ),
  ],
});
