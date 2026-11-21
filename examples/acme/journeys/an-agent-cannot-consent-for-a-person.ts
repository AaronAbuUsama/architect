// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It is acme's copy: the organizations plugin has the same journey, and M2.23 deletes this one.
//
// `invitation.accept` says `.notVia(Via.agent)`: consent is a person's own act, so Olga's agent is refused and the invitation stays pending,
// and Olga herself is not refused. The MCP door agrees with the operation: the tools list of an agent holds no `invitation.accept` and no
// `api-key.create`, and still holds `invitation.send`, so an empty list cannot pass `lacks`. `.tools()` answers `{ tools }`, the wire names
// the door lists (`design/decisions/M2-auth.md`, fork 2: the door lists a tool when some entry admits an agent).
import { Blueprint, Via, emits, expect, lacks, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import { machine as invitation } from "../blueprint/things/invitation/machine.ts";
import { InvitationAccepted } from "../blueprint/things/invitation/events.ts";
import accept from "../blueprint/things/invitation/verbs/accept.ts";
import createKey from "../blueprint/things/api-key/verbs/create.ts";

export default Blueprint.journey("an agent cannot consent for a person", {
  cast: { ada: owner, olga: Blueprint.signedIn },
  starts: "invited",
  steps: (s) => [
    s.step(
      "olga's agent can't accept the invitation for her",
      s.olga.via(Via.agent).run(accept, { invitation: s.world.invitation }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      invitation.isIn(s.world.invitation, "pending"),
      spans({ present: ["invitation.accept.refused"], absent: ["invitation.accept", "invitation.accept.join"] }),
    ),
    s.step(
      "an agent's tools hold no way to consent and no way to make a key, and still hold the rest",
      s.olga.via(Via.agent).tools(),
      lacks(accept, createKey),
      expect((a) => a.tools.includes("invitation.send")).toBe(true),
      expect((a) => a.tools.includes("invitation.revoke")).toBe(true),
    ),
    s.step(
      "olga accepts for herself",
      s.olga.run(accept, { invitation: s.world.invitation }),
      expect((a) => a.organization).toBe(s.world.organization),
      expect((a) => a.membership).toMatch(/^mem_[0-9a-z]+$/),
      emits(InvitationAccepted, { invitation: s.world.invitation, membership: s.last.membership }),
      invitation.isIn(s.world.invitation, "accepted"),
      spans({ present: ["invitation.accept", "invitation.accept.join"] }),
    ),
  ],
});
