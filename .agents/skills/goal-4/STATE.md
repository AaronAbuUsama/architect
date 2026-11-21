# Goal 4: state

Updated 21 November 2026 by the Goal 4 lead. Check against GitHub before acting (the skill's resume step 6).

## Hand-over in one line

Lead Goal 4: read this file, then the goal-4 skill's "Resume in this order". Next action: merge [#279](https://github.com/AaronAbuUsama/architect/pull/279) when CI is
green, then get slice 3 built.

## Where it stands

- `goal/on-chain` has stage 1 merged in at `37778735` ([#273](https://github.com/AaronAbuUsama/architect/pull/273), merged as `51c0bd87`), the snag log, and the branch's
  protection recorded.
- Slice 0 (K27): done before the goal.
- Slice 1 (the language and host seam): **held** until Goal 3's sign-in extraction (M2.05) merges on `goal/stage-1`
  (K28; both reshape `host-cloudflare`). Not merged as of this update. Check at each slice start: M2.05's row in
  `git show origin/goal/stage-1:design/milestones.md` is ticked ✅, or `gh pr list --base goal/stage-1 --state merged --search M2.05`.
- Slice 1b (the chain decision, M6.01): `design/decisions/M6-chain.md`, **merged** 21 November 2026 ([#275](https://github.com/AaronAbuUsama/architect/pull/275), `dee1926b`).
- Slice 2 (M6.02): the budgets blueprint and seven journeys, **merged** 21 November 2026 ([#276](https://github.com/AaronAbuUsama/architect/pull/276), `b776818d`); the `e2e:on-chain` done check, [#279](https://github.com/AaronAbuUsama/architect/pull/279)
  (hostile pass, two 🔍 rounds, passed), waits on CI. Its `e2e-on-chain` job has already run green.
- Slice 3 (M6.10, the chain store and values): checks written, [#283](https://github.com/AaronAbuUsama/architect/pull/283), aligned to M6-chain item 11 (its lock-wire file moved to slice 4); a hostile pass was running (a subagent of the old lead; if its result isn't on #283, run it again), then
  a 🔍 and a framework builder. Its build waits on money's cases (M6-money).
- Slices 4 to 12: not started.

## Open pull requests, in merge order

| PR | Branch | What | Waiting on |
|---|---|---|---|
| [#279](https://github.com/AaronAbuUsama/architect/pull/279) | `goal-4/m602-target-check` | the `e2e:on-chain` done check | CI |
| [#287](https://github.com/AaronAbuUsama/architect/pull/287) | `goal-4/m6-money` | the money decision | 🔍, CI |
| [#283](https://github.com/AaronAbuUsama/architect/pull/283) | `goal-4/m610-check` | slice 3's checks | hostile pass, money's cases (after [#287](https://github.com/AaronAbuUsama/architect/pull/287)), 🔍 |
| [#284](https://github.com/AaronAbuUsama/architect/pull/284) | `goal-4/state-skill` | this skill | CI, 🔍 |

After [#279](https://github.com/AaronAbuUsama/architect/pull/279) merges: add `e2e-on-chain` to `goal/on-chain`'s required checks (once it has run green) and record it in
`design/decisions/CI-branch-protection.md`.

## Waiting on Aaron

Nothing. Money (ledger `THI-07`) was answered by Aaron himself on 21 November 2026, all five recommendations ("agreed on
all questions"; the conductor had given the same under his standing authority). Recorded in
`design/decisions/M6-money.md`, [#287](https://github.com/AaronAbuUsama/architect/pull/287) (🔍 running): every amount names its asset (fixed, or
`money.of` a field of the same thing); assets are files in `blueprint/assets/`; base units everywhere, digits-only on
the wire, formatted at the faces; unsigned unless signed; built in slice 3. Slice 3's checks author (a subagent of
this lead) was asked to add money's seven cases to [#283](https://github.com/AaronAbuUsama/architect/pull/283); Goal 7's lead (Foreman) was given the same shape.

## Waiting on Goal 7 (Safe, Hats and budgets; Foreman runs it)

Slice 7 (Host.chain and the safe adapter) rests on five runs Goal 7 took as A1 to A5 on `goal/safe-hats`, ahead of Hats:
deploying a Safe from its release on Anvil; enabling a module on a 1-of-1 Safe; how a failed ERC-20 transfer through
`execTransactionFromModule` comes back; a Safe signing our EIP-712 message through ERC-1271 with `SignatureChecker`;
and a Safe calling the direct entry through `execTransaction`. Foreman reports the commit, and the evidence in
`spikes/safe-hats-module/`, when it lands.

## Passed to Goal 3 (through the conductor)

- Codex: `packages/compiler/src/modules/model/internal/invariants.ts:83`, a rule refusal's auto-filled field schemas
  aren't checked against the key fields'.
- Codex: `packages/projections/src/modules/server/internal/worker-config.ts:67`, rule index names differing only in case
  collide in SQLite.
- Codex (on #283): `packages/language-effect/src/modules/records/internal/holder.ts:31`, the pre-commit unique-rule check
  rescans every held row per row, cubic in a bulk write's size.

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
