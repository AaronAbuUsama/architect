# looser-budget

**Plants:** `allowance.spend` with `budget: { p95: "300 millis" }` instead of 150: nothing else changes. Install over
`blueprint/things/allowance/verbs/spend.ts`. A budget change is a patch (D3 #1) and it unproves spend's verdicts.

**What must catch it:** after a release is in staging and production, `ortho impact` prints `stale allowance.spend in staging, production`
and no other operation (Gate 2 check 3); the portal shows `stale` on the `allowance.spend` row only (check 8).
