# Goal 4: state

Updated 21 November 2026 by the Goal 4 lead. Check against GitHub before acting (the skill's resume step 6).

## Where it stands

- `goal/on-chain` has stage 1 merged in at `37778735` (#273, merged as `51c0bd87`), the snag log, and the branch's
  protection recorded.
- Slice 0 (K27): done before the goal.
- Slice 1 (the language and host seam): **held** until Goal 3's sign-in extraction (M2.05) merges on `goal/stage-1`
  (K28; both reshape `host-cloudflare`). Not merged as of this update. Check at each slice start.
- Slice 1b (the chain decision, M6.01): `design/decisions/M6-chain.md`, #275. 🔍 passed after two rounds; waiting on
  CI, then merge.
- Slice 2 (M6.02): the budgets blueprint and seven journeys, #276 (🔍 passed); the `e2e:on-chain` done check, #279
  (hostile pass, two 🔍 rounds, passed). Both wait on CI and on #275.
- Slice 3 (M6.10, the chain store and values): checks written, #283, being aligned to M6-chain item 11; then a hostile
  pass, a 🔍, and a framework builder.
- Slices 4 to 12: not started.

## Open pull requests, in merge order

| PR | Branch | What | Waiting on |
|---|---|---|---|
| #275 | `goal-4/m6-chain` | the chain decision | CI |
| #276 | `goal-4/m602-journeys-check` | budgets blueprint and journeys | CI, #275 |
| #279 | `goal-4/m602-target-check` | the `e2e:on-chain` done check | CI, #276 |
| #283 | `goal-4/m610-check` | slice 3's checks | item 11 alignment, hostile pass, 🔍 |
| (this one) | `goal-4/state-skill` | this skill | CI |

After #279 merges: add `e2e-on-chain` to `goal/on-chain`'s required checks (once it has run green) and record it in
`design/decisions/CI-branch-protection.md`.

## Waiting on Aaron

- **Money** (ledger `THI-07`): a value for money. Goal 4 does not need it to prove the chain (M6-chain item 2 uses a
  token account plus base units), but slice 3 builds values, so deciding now lets slice 3 build it once. Grilled 21
  November 2026; record his answers as a decision and update item 2.

## Passed to Goal 3 (through the conductor)

- Codex: `packages/compiler/src/modules/model/internal/invariants.ts:83`, a rule refusal's auto-filled field schemas
  aren't checked against the key fields'.
- Codex: `packages/projections/src/modules/server/internal/worker-config.ts:67`, rule index names differing only in case
  collide in SQLite.

## Snags

S-01 to S-11 open (`design/goals/04-snags.md`): each a framework piece the budgets journeys need, each naming its slice.

## What went well

- Writing the chain decision early, then answering every author's questions into it (items 10 and 11) gave the
  journeys, the done check and slice 3 one spec to build to.
- The hostile pass found real holes in every check (snag statuses with fake PR numbers, a seam check that compared a
  branch with itself, a signer check one shared key could pass). Reviewers alone had missed them.
- Two 🔍 rounds on the decision caught a changed meaning of "intent" with no supersede line, and a refusal list that
  contradicted the not-found rule.

## What did not go well

- Side sessions could not be started over Remote Control; roles ran as subagents instead (fine, but not visible as
  sessions to Aaron).
- A reviewer checked out a branch in the lead's worktree and left a detached head.
- The kanban snapshot carried a superseded phrase and failed CI's supersede check on the first push.
- CI is slow (45 to 60 minutes a pull request), so a stacked chain of four takes hours to land.

## Lessons for the next lead

- Give every subagent reviewer an explicit "read-only, no checkout in shared worktrees" line.
- Run `tools/ci/supersedes.sh` before pushing any decision.
- Answer an author's questions in the decision itself, as a numbered item, not only in a message.
- Turn off auto-archive on PR close at the start.
- Keep this file current in the same pull request as every merge.
