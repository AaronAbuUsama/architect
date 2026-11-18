// Journey-author file. The builder of allowance.spend never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, spans } from "@formants/forman";
import { grantee } from "../blueprint/things/allowance/roles.ts";
import { AllowanceSpent } from "../blueprint/things/allowance/events.ts";
import spend from "../blueprint/things/allowance/verbs/spend.ts";
import get from "../blueprint/things/allowance/verbs/get.ts";

export default Blueprint.journey("spend twice with one request", {
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step(
      "olga spends 100",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, memo: "coffee" }, { request: "coffee-1" }),
      expect((a) => a.remaining).toBe(400n),
      emits(AllowanceSpent, { allowance: s.world.allowance, amount: 100n, remaining: 400n }),
    ),
    s.step(
      "the same request again gives the same answer and spends nothing",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 100n, memo: "coffee" }, { request: "coffee-1" }),
      expect((a) => a.remaining).toBe(400n),
      noEvents(),
      spans({ absent: ["allowance.spend.record"] }),
    ),
    s.step(
      "only 100 was spent",
      s.olga.run(get, { id: s.world.allowance }),
      expect((a) => a.spent).toBe(100n),
    ),
  ],
});
