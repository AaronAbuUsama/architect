// Journey-author file. The builder of invitation.accept and invitation.revoke never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine } from "../blueprint/things/invitation/machine.ts";
import { InvitationAccepted } from "../blueprint/things/invitation/events.ts";
import accept from "../blueprint/things/invitation/verbs/accept.ts";
import revoke from "../blueprint/things/invitation/verbs/revoke.ts";

export default Blueprint.journey("an invitation is used once", {
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "invited",
  steps: (s) => [
    s.step(
      "olga accepts the invitation ada sent her",
      s.olga.run(accept, { invitation: s.world.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { invitation: s.world.invitation, membership: s.last.membership }),
      machine.isIn(s.world.invitation, "accepted"),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "accepting it again is refused",
      s.olga.run(accept, { invitation: s.world.invitation }),
      refuses(machine.notFrom, { state: "accepted" }),
      noEvents(),
      machine.isIn(s.world.invitation, "accepted"),
      spans({ absent: ["invitation.accept.join"] }),
    ),
    s.step(
      "ada can't revoke an invitation that has been accepted",
      s.ada.run(revoke, { invitation: s.world.invitation }),
      refuses(machine.notFrom, { state: "accepted" }),
      noEvents(),
      spans({ absent: ["invitation.revoke.update"] }),
    ),
  ],
});
