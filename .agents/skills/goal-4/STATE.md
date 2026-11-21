# Goal 4: state

Updated 21 November 2026 by the Goal 4 lead. Check against GitHub before acting (the skill's resume step 6).

## Hand-over in one line

Lead Goal 4: read this file, then the goal-4 skill's "Resume in this order". Next action: merge [#287](https://github.com/AaronAbuUsama/architect/pull/287) (money) when
CI is green, then get slice 3's checks (with money's cases) through a hostile pass and a 🔍, then build slice 3.

## Where it stands

- `goal/on-chain` has stage 1 merged in at `37778735` ([#273](https://github.com/AaronAbuUsama/architect/pull/273), merged as `51c0bd87`), the snag log, and the branch's
  protection recorded.
- The goal-4 skill and this file: **merged** 21 November 2026 ([#284](https://github.com/AaronAbuUsama/architect/pull/284), `ef768ce1`). Later notes ride the next pull request (CI-drafts).
- Slice 0 (K27): done before the goal.
- Slice 1 (the language and host seam): **held** until Goal 3's sign-in extraction (M2.05) merges on `goal/stage-1`
  (K28; both reshape `host-cloudflare`). Not merged as of this update. Check at each slice start: M2.05's row in
  `git show origin/goal/stage-1:design/milestones.md` is ticked ✅, or `gh pr list --base goal/stage-1 --state merged --search M2.05`.
- Slice 1b (the chain decision, M6.01): `design/decisions/M6-chain.md`, **merged** 21 November 2026 ([#275](https://github.com/AaronAbuUsama/architect/pull/275), `dee1926b`).
- Slice 2 (M6.02): the budgets blueprint and seven journeys, **merged** 21 November 2026 ([#276](https://github.com/AaronAbuUsama/architect/pull/276), `b776818d`); the `e2e:on-chain` done check, **merged** 21 November 2026 ([#279](https://github.com/AaronAbuUsama/architect/pull/279), `607d62cf`);
  `e2e-on-chain` is now a required check on `goal/on-chain`. Slice 2 is done.
- Slice 3 (M6.10, the chain store and values): checks written, [#283](https://github.com/AaronAbuUsama/architect/pull/283), aligned to M6-chain item 11 (its lock-wire file moved to slice 4); a hostile pass was running (a subagent of the old lead; if its result isn't on #283, run it again), then
  a 🔍 and a framework builder. Money's cases, two hostile passes' fixes and proof 2 (a stand-in ortho passing every 04 file) are in; the 🔍 passed on its second round (head `763b6d1c`), and #283 is ready, in CI. A framework builder (a subagent of this lead, its own worktree) builds on `goal-4/m610-build` from the checks plus M6-money, and opens a draft. Merge [#287](https://github.com/AaronAbuUsama/architect/pull/287) before #283 (item 11 cites M6-money). Tell slice 3's builder: `02-seam-byte-identical` needs acme's and Plugged In's `blueprint/refusals.lock` committed.
- Slices 4 to 12: not started.

## Open pull requests, in merge order

| PR | Branch | What | Waiting on |
|---|---|---|---|
| [#303](https://github.com/AaronAbuUsama/architect/pull/303) | `goal-4/main-merge` | main merged in; K32 and K33 | 🔍, then ready |
| [#287](https://github.com/AaronAbuUsama/architect/pull/287) | `goal-4/m6-money` | the money decision | CI (🔍 passed) |
| [#283](https://github.com/AaronAbuUsama/architect/pull/283) | `goal-4/m610-check` | slice 3's checks | CI (🔍 passed); merge after [#287](https://github.com/AaronAbuUsama/architect/pull/287) |

`e2e-on-chain` is required on `goal/on-chain` since 21 November 2026 (`design/decisions/CI-branch-protection.md`).

**`main` merged in** by [#303](https://github.com/AaronAbuUsama/architect/pull/303) (draft, 🔍 round 2): through Goal 3's own main merge (#277, now on
`goal/stage-1`), then `origin/main`: CI-drafts (#293) and Effect 4.1.4 (#295) everywhere, the draft guard on
`e2e-on-chain`, and the brief adopting K32 and K33 (front matter, "Where it stands", owned paths). When
[#287](https://github.com/AaronAbuUsama/architect/pull/287) merges, its own row puts `M6-money` in the brief's decision list. Slice 1b doesn't parse as a slice number in K33's
`readSlice` (digits only), so the sync skips it; asked on [#301](https://github.com/AaronAbuUsama/architect/pull/301#issuecomment-7061949704) to accept `\d+[a-z]?`. Goal 4 keeps the name `1b`.

## Waiting on Aaron

Nothing. Money (ledger `THI-07`) was answered by Aaron himself on 21 November 2026, all five recommendations ("agreed on
all questions"; the conductor had given the same under his standing authority). Recorded in
`design/decisions/M6-money.md`, [#287](https://github.com/AaronAbuUsama/architect/pull/287) (🔍 passed on the second round; waits on CI): every amount names its asset (fixed, or
`money.of` a field of the same thing); assets are files in `blueprint/assets/`; base units everywhere, digits-only on
the wire, formatted at the faces; unsigned unless signed; built in slice 3. Slice 3's checks author (a subagent of
this lead) was asked to add money's seven cases to [#283](https://github.com/AaronAbuUsama/architect/pull/283); Goal 7's lead (Foreman) was given the same shape.

## From Goal 7 (Safe, Hats and budgets; Foreman runs it)

Slice 7's five Safe questions are answered with runs on Anvil: commit 149b7dfa on `goal/safe-hats`, evidence in
`spikes/safe-hats-module/evidence/goal-4.txt`, code in `script/goal4.ts`, `script/safe.ts`, `test/SafeFixtures.sol`.
Read first-hand by the lead, 21 November 2026.

1. Safe 1.5.0: its singleton, proxy factory and CompatibilityFallbackHandler are enough (no MultiSend).
2. `enableModule` through a signed Safe transaction works on a 1-of-1 and a 2-of-3 Safe.
3. A token returning `false` still makes `execTransactionFromModule` return `true`; a reverting token makes it return
   `false` without reverting. So the module uses `execTransactionFromModuleReturnData` and checks both itself (snag
   S-12, for slice 4's decision step).
4. A Safe signing the Budgets typed data through ERC-1271 (SafeMessage via the fallback handler) is accepted by
   OpenZeppelin 5.7.0's `SignatureChecker`; a tampered signature is refused.
5. Anyone can relay a Safe's call to the direct entry: 93,260 gas, against 90,770 for the signed route.

Goal 7 puts M6-money's shape into its budgets module next.

Goal 7's spike passed its done check ([#294](https://github.com/AaronAbuUsama/architect/pull/294)): a hat budgets module, fuzz, an Anvil run, and a
draft `design/decisions/ST3-budgets.md` (stage 3, ST3.02). Read by the lead on 21 November 2026; it changes nothing in
Goal 4:
- Its rows are keyed by (Safe, hat); Goal 4's by a client-minted id with `safe` and `member` fields. Stage 3 can keep
  id keys with a rule on (safe, hat), and that also answers its open "regrant" question: a regrant is a new row.
- Its spender is whoever wears the hat, read live from Hats: neither a `who` nor a `holds` role (M6-chain item 5).
  A chain role that reads another contract is a stage 3 decision, not Goal 4's.
- Its payment (`spikes/safe-hats-module/src/SafePayment.sol`) already uses `execTransactionFromModuleReturnData`:
  the reference for snag S-12. Its amounts already follow M6-money.

## Passed to Goal 3 (through the conductor)

- Codex: `packages/compiler/src/modules/model/internal/invariants.ts:83`, a rule refusal's auto-filled field schemas
  aren't checked against the key fields'.
- Codex: `packages/projections/src/modules/server/internal/worker-config.ts:67`, rule index names differing only in case
  collide in SQLite.
- Codex (on #283): `packages/language-effect/src/modules/records/internal/holder.ts:31`, the pre-commit unique-rule check
  rescans every held row per row, cubic in a bulk write's size.

## Snags

S-01 to S-12 open (`design/goals/04-snags.md`): each a framework piece the budgets journeys need, each naming its slice.
From K33 (21 November 2026), new snags are Snag issues in Goal 4's milestone. The done check's snag line
(`e2e/on-chain/03-snags.test.ts`) reads only `04-snags.md`, so a checks author must extend it to require every Snag
issue in the milestone closed or parked, before the goal lands.

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
