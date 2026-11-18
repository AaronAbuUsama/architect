// Journey-author file. The builder of allowance.get never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, refuses } from "@formants/forman";
import { owner } from "../blueprint/things/organization/roles.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("read an allowance", {
  // bob is signed in but is neither the grantee nor the organisation's owner.
  cast: { ada: owner, olga: grantee, bob: Blueprint.signedIn },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga reads her allowance",
      s.olga.run(get, { id: s.world.allowance }),
      expect((a) => a.state).toBe("active"),
      expect((a) => a.limit).toBe(500n),
      expect((a) => a.spent).toBe(0n),
      noEvents(),
    ),
    s.step(
      "ada, the owner, reads it too",
      s.ada.run(get, { id: s.world.allowance }),
      expect((a) => a.member).toBe(s.olga.person),
      expect((a) => [a.state, a.limit, a.spent]).toEqual(["active", 500n, 0n]),
    ),
    s.step(
      "bob is refused",
      s.bob.run(get, { id: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
    ),
  ],
});
