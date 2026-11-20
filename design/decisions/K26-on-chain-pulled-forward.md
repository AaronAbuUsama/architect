# K26: on chain, pulled forward

Decided 20 November 2026 by Aaron. The conductor relayed his words in the 📐 on-chain designer's brief the same day:
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
   Aaron in a 📐 Designer thread and recorded as decisions as they land. K25 is the first.
2. **Building follows the design, slice by slice,** each when its own `needs` are met, without waiting for the stage 2
   or stage 3 gate. Checks come first, as always: an author writes the failing checks, and a builder makes them pass.
3. **What is not pulled forward:** the gates themselves. Each gate's suite still runs and still has to pass where the
   stages put it. A slice pulled forward that touches a gate's suite counts toward that gate when it comes.
4. **No collision with Goal 3.** Until Goal 3's invariants work (ST1.14 to ST1.18) has landed on `goal/stage-1`,
   on-chain building touches only `packages/language-solidity` and `spikes/`. `packages/compiler`,
   `packages/orthograph` and the model wait, or go through the conductor first. Pull requests go into
   `goal/stage-1` while Goal 3 is open, and into `main` after.
5. **This is Aaron's exception, not a new rule.** Any other milestone still waits for its gate unless Aaron pulls it
   forward in the same way, with his words recorded.

## What it touches

| Dependent | Change |
|---|---|
| `design/milestones.md`, the table of slices whose `needs` names an old gate | M6.01 is read as "none: now (K26)" |
| M6.10 to M6.17 and M6.21 (stage 3's chain slices) | may start once their own `needs` are met, before stage 2's gate |
| Goal 3 on `goal/stage-1` | unaffected (item 4) |

## Supersedes

- design/milestones.md (the stage table): "| M6.01 (stage 2's chain decision) | Gate M5 | Gate M2 |" → "| M6.01 (stage 2's chain decision) | Gate M5 | none: started 20 November 2026 (K26, Aaron's exception) |"
