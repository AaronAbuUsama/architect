// Journey-author file, planted: it calls allowance.list, which exists only once a copy has added the read, so it is
// a fixture and not in journeys/. Install as journeys/an-owner-lists-allowances.ts after list.ts.
import { Blueprint, expect, noEvents, refuses } from "@architect/blueprint";
import { owner } from "../blueprint/things/organization/roles.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import list from "../blueprint/things/allowance/verbs/list.ts";

export default Blueprint.journey("an owner lists allowances", {
  // bob is signed in but is neither the grantee nor the organisation's owner.
  cast: { ada: owner, olga: grantee, bob: Blueprint.signedIn },
  starts: "funded",
  steps: (s) => [
    s.step(
      "ada, the owner, lists her organisation's allowances",
      s.ada.run(list, { organization: s.world.organization }),
      // The answer is a page: { items, next }. The funded world holds one allowance, olga's.
      expect((page) => page.items.length).toBe(1),
      expect((page) => page.items[0]?.member).toBe(s.olga.person),
      expect((page) => [page.items[0]?.state, page.items[0]?.limit, page.items[0]?.spent]).toEqual(["active", 500n, 0n]),
      noEvents(),
    ),
    s.step(
      "ada narrows the list to a member with none",
      s.ada.run(list, { organization: s.world.organization, member: s.ada.person }),
      expect((page) => page.items.length).toBe(0),
    ),
    s.step(
      "bob is refused",
      s.bob.run(list, { organization: s.world.organization }),
      refuses(Blueprint.NotAllowed),
    ),
  ],
});
