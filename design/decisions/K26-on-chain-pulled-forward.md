# K26: on chain, pulled forward

Decided 20 November 2026 by Aaron. The conductor relayed his words in the brief that started the 📐 on-chain designer
session the same day (the session's transcript; the brief is not in the repository):
"the solidity thing in and of itself, like how you go from blueprint to like the whole, through the whole life cycle,
deployed on a chain and whatnot, what the abstractions are called, how they work. That whole thing is kind of a black
hole ... I want to ... work on the DX of how it's supposed to look ... work on the flow of it a bit, and then we're
gonna go and build it." His product reason is Capxul Next (companies, authority, budgets, pay, Safe accounts on chain),
which is being redrawn on Orthograph and needs the chain half to exist.

## The rule it is an exception to

```text
AGENTS.md, "How work flows": Nothing in a milestone starts until the previous milestone's gate passes on `main`.
design/milestones.md, the stage table: M6.01 (stage 2's chain decision) | Gate M5 | read as Gate M2
```

Under the stages (K9), on-chain work waits for stage 1's gate (Gate M2) and is then spread across stages 2 and 3.
Aaron is bringing it forward, so it starts while stage 1 is still being climbed on `goal/stage-1`.

## Decided

1. **The on-chain design starts now.** M6.01 (the chain decision) no longer waits for any gate. It is worked with
   Aaron in a 📐 Designer thread and recorded as decisions as they land. The first is
   [K25](K25-the-blueprint-on-chain.md), the blueprint on chain (pull request #218, merged before this one).
2. **Building follows the design, slice by slice,** each when its own `needs` are met, without waiting for the stage 2
   or stage 3 gate. Checks come first, as always: an author writes the failing checks, and a builder makes them pass.
3. **What is not pulled forward:** the gates themselves. Each gate's suite still runs and still has to pass where the
   stages put it. A slice pulled forward that touches a gate's suite counts toward that gate when it comes.
4. **No collision with Goal 3.** Until Goal 3's bound (G10: ST1.01 to ST1.04 and ST1.06 to ST1.24) has landed on
   `goal/stage-1`, on-chain work touches only `design/`, `packages/language-solidity` and `spikes/`. So the design
   and the spikes run now, but M6.10 onward wait: M6.10 already changes the compiler (`runs: "chain"`,
   `describe.ts`) and the `orthograph` front door, and M6.11 to M6.14 reach the model and the SDK. A slice may start
   earlier only when the conductor clears its files against Goal 3's. Pull requests go into `goal/stage-1` while
   Goal 3 is open, and into `main` after.
5. **This is Aaron's exception, not a new rule.** Any other milestone still waits for its gate unless Aaron pulls it
   forward in the same way, with his words recorded.

## What it touches

| Dependent | Change |
|---|---|
| `design/milestones.md`, the table of slices whose `needs` names an old gate | M6.01 is read as "none: started 20 November 2026 (K26, Aaron's exception)" |
| M6.02, M6.07, M6.09 and M6.10 to M6.18 (stage 2 and 3's chain slices: the journeys, the relayer, the follower, the contracts and the key checks) | may start once their own `needs` are met and Goal 3 has landed (item 4), before the stage 2 or 3 gate |
| M6.21 (moves made by time in Solidity) | not freed: it also needs M8.09, the time work, which is not pulled forward |
| `AGENTS.md`, "How work flows" | one line points here, so the gate rule there names its exception |
| K9, "The order after workable" (a dated record) | a dated note beside stage 3 points here |
| The kanban board (`.agents/skills/kanban/data/`, `STATE.md`) | not edited by hand: its saved files are snapshots of the live board, which the conductor updates and saves again |
| Goal 3 on `goal/stage-1` | unaffected (item 4) |

## Supersedes

- design/milestones.md (the stage table): "| M6.01 (stage 2's chain decision) | Gate M5 | Gate M2 |" → "| M6.01 (stage 2's chain decision) | Gate M5 | none: started 20 November 2026 (K26, Aaron's exception) |"
