// Journey-author file. The builder of allowance.revoke and allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, noEvents, refuses, spans } from "@architect/blueprint";
import { owner } from "../blueprint/things/organization/roles.ts";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { machine } from "../blueprint/things/allowance/machine.ts";
import { AllowanceRevoked } from "../blueprint/things/allowance/events.ts";
import revoke from "../blueprint/things/allowance/verbs/revoke.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";

export default Blueprint.journey("revoke then spend", {
  cast: { ada: owner, olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "ada revokes it",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      machine.isIn(s.world.allowance, "revoked"),
      spans({ present: ["allowance.revoke", "allowance.revoke.update"] }),
    ),
    s.step(
      "olga can't spend",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, memo: "coffee" }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      spans({ absent: ["allowance.spend.record"] }),
    ),
    s.step(
      "olga can't revoke it either",
      s.olga.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["allowance.revoke"] }),
    ),
  ],
});
