// Journey-author file. The builder of allowance.revoke never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, noEvents, refuses, spans } from "@architect/blueprint";
import { machine } from "../blueprint/things/allowance/machine.ts";
import revoke from "../blueprint/things/allowance/verbs/revoke.ts";

export default Blueprint.journey("an outsider cannot revoke", {
  // bob is signed in but owns nothing: he is not the organisation's owner.
  cast: { bob: Blueprint.signedIn },
  starts: "funded",
  steps: (s) => [
    s.step(
      "bob is refused and the handler never runs",
      s.bob.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["allowance.revoke"] }),
      machine.isIn(s.world.allowance, "active"),
    ),
  ],
});
