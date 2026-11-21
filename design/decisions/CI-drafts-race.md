# CI-drafts-race: a run whose payload says draft can neither cancel a ready run nor pass a required check

21 November 2026. An amendment to [`CI-drafts.md`](CI-drafts.md), decided by the building agent under AGENTS.md, "Who
decides", after a pull request into `main` merged with every required check skipped.

## What happened

Pull request 301 (`claude/github-native`, head `91626ef1`) was pushed while still a draft, and `gh pr ready` ran straight
after. GitHub logged `ready_for_review` at 15:55:15Z, then started two `pull_request` runs of `ci`:

| Run | Created | Payload | What it did |
|---|---|---|---|
| 44921725636 | 15:55:18Z | `ready_for_review`, `draft: false` | the real run; cancelled at 15:55:20Z |
| 44921727254 | 15:55:19Z | `synchronize`, `draft: true` (the push, delivered after the ready event) | cancelled the real run through the shared concurrency group `ci-ci-pr-301`, then skipped every job through the draft guard |

The commit's check runs (`gh api repos/Open-Harness/orthograph/commits/91626ef1/check-runs`) show both sets side by
side: `check`, `e2e-layer1`, `e2e-layer2` and `e2e-m0` once `cancelled` (the real run) and once `skipped` (the draft
run, created later). Branch protection reads the latest check run of each name, and a skipped check run counts as
passed, so `gh pr merge --auto` merged it at 15:55:47Z. `main`'s own push run (44921770813) passed afterwards, so
nothing broke, but the gate was open: CI-drafts' "A draft cannot merge, so a skipped job on a draft never lets anything
through" assumed a draft payload only ever arrives while the pull request is a draft.

## What GitHub does, measured

A probe on 21 November (a throwaway `probe/skipped-names` branch, run 44923553751, deleted after) ran one workflow with
three jobs named `${{ github.event_name == 'push' && 'evaluated-…' || 'raw' }}`:

| Job | Check run name |
|---|---|
| ran | `evaluated-ran` |
| skipped by its `if:` | `github.event_name == 'push' && 'evaluated-if' \|\| 'raw'` |
| skipped because its `needs` skipped | `github.event_name == 'push' && 'evaluated-needs' \|\| 'raw'` |

GitHub evaluates a job's `name:` only when the job runs. A skipped job's check run carries the expression's text. (The
same shows on 301: the skipped matrix job is named `prove-tests (${{ matrix.shard }}/3)`.) So the gating-job shape,
where one job holds the draft guard and the required jobs `needs` it, does not close the hole: a job whose needs
skipped is itself skipped, under its plain name, and passes.

## The call

1. **A draft-payload run has a concurrency group of its own.** The group is `ci-ci-pr-<n>-draft` when the payload says
   draft and `ci-ci-pr-<n>` otherwise. Draft runs cancel only older draft runs, ready runs only older ready runs, so a
   late draft payload can no longer cancel the ready run.
2. **A required job never skips on a ready run.** Its `if:` is the draft guard alone (with `!cancelled()` when it has
   `needs`), and it decides in its steps. `builder-paths` runs on every pull request and push and does its work only on
   a `-build` pull request; on a docs-only pull request `e2e-layer1` and `e2e-layer2` run and pass without their steps,
   a runner for a few seconds each. `check` and `e2e-m0` already never skipped. Jobs no branch requires (`check-static`,
   `prove-tests`, `changes`, `e2e-m8`) may still skip.
3. **A required job's name is `${{ github.event.pull_request.draft && '<id> (draft)' || '<id>' }}`.** On a ready run it
   evaluates to the required name. On a draft run the job skips, and its check run carries the expression's text, which
   no required check matches; should GitHub ever evaluate skipped names, it carries `<id> (draft)`, which none matches
   either. Either way a draft run leaves the required checks as they were: pending ("Expected") until a ready run
   reports them.
4. **`tools/ci/required-jobs.sh` holds rules 2 and 3,** run in `check-static` over the five checks `main` requires (its
   cases are in `tools/ci/ci.test.sh`). A branch that requires a new check adds its job to that line.

Rule 1 alone would have saved 301, but a draft run that started before the ready one could still finish first and
leave skipped required checks on a ready pull request until the ready run's jobs reported. Rules 2 and 3 alone fail
closed but can stall: a late draft run would cancel the ready run, and the required checks would sit cancelled until
someone pushed again. Together a draft payload can do neither.

## Where it reaches

`main` from this change. Goal branches carry their own `ci.yml` (CI-drafts): each lead takes this when it next merges
`main` in, and gives its branch's extra required jobs (`portal-ui`, `e2e-m1`, `e2e-climb`, `e2e-grid` on
`goal/stage-1`) the same name and guard, listing them in its `required-jobs.sh` line. Branch protection is unchanged.

## Proof

On the pull request that made this change: pushed while a draft, then `gh pr ready` at once. Its description gives the
runs, the check runs on its head and its merge state while the ready run was going.

## Supersedes

- `design/decisions/CI-drafts.md` (dated, noted in place): "A draft cannot merge, so a skipped job on a draft never lets anything through." → "A draft-payload run can arrive after the ready one; it has its own concurrency group, and its skipped jobs carry names no required check matches."
- `.github/workflows/ci.yml`: "Skipped on a docs-only pull request, where a skip counts as passed." → "On a docs-only pull request the job runs and passes without its steps: a required job never skips."
- `.github/workflows/ci.yml`: "a skipped job counts as passed where it is required" → "the job still runs and passes at once, guarding nothing: a required job never skips"
- AGENTS.md: "skip passes (`design/decisions/CI-docs-fast-path.md`)" → "pass without running their steps (`design/decisions/CI-docs-fast-path.md`)"
- `design/decisions/CI-docs-fast-path.md` (dated, noted in place): "skip through a job-level `if:`" → "run and pass without their steps"
- `design/decisions/CI-branch-protection.md` (dated, noted in place): "which is skipped, and so passes, on anything but a `-build` branch" → "which runs and passes at once on anything but a `-build` branch"
