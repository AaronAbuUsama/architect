# Branch protection, and the CI guards behind it

19 November 2026. Proposals 2, 4 (the closed-PR half), 6 and 8 (the mechanical half) in `design/process/proposals.md`,
applied by the ci-guards thread on Aaron's "Yes, apply them" (19 November 2026), which is his written yes to proposal 2.

## Why

Nothing enforced the landing rules. #127 merged into `main` with three checks still running; Codex findings sat up to 17
hours unanswered and two merged with their findings open; builders edited the journeys, evals or checks that judge them
five times in three days (`design/process/patterns.md`). The rules were right and written down; GitHub let every one
of them be skipped.

## What GitHub now refuses

### `main`

Set with `gh api -X PUT repos/AaronAbuUsama/architect/branches/main/protection`:

```json
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "check" },
      { "context": "e2e-layer1" },
      { "context": "e2e-layer2" },
      { "context": "e2e-m0" },
      { "context": "builder-paths" },
      { "context": "codex-finished" }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "required_conversation_resolution": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

- **The checks** are every job `main`'s `ci.yml` runs (`check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, and
  `builder-paths`, which is skipped, and so passes, on anything but a `-build` branch), plus the `codex-finished` status.
- **`strict`**: the branch must contain the current `main` before it merges, so the green run is of what will land (the
  conductor's landing rule 2, "a fresh CI run on a head that includes the current `main`").
- **Conversation resolution**: every review thread, Codex's included, is resolved before the merge.
- **No required approvals**: the agents merge their own pull requests (`AGENTS.md`); the 🔍 pass stays the conductor's
  landing rule, not a GitHub review.
- **`enforce_admins: true`**, against the proposal's `false`. Every agent and Aaron act through Aaron's admin account, so
  with it off the protection binds no one: `gh pr merge --admin`, the API's merge endpoint or a local merge and push
  skip every check with a warning. With it on, a merge waits for green like everyone else's. To merge around it in an
  emergency, Aaron removes the protection (below) and puts it back.

### `m1` and `goal/stage-1`

Agreed with the Goal 3 lead before they were set; see "Milestone and goal branches" below.

## The checks that are new

- **`codex-finished`** (`.github/workflows/codex-finished.yml`, `tools/ci/codex-state.sh`): a commit status on a pull
  request's head. Codex keeps one summary comment per pull request, with a machine-readable line
  (`<!-- codex-review-state:v1 {…} -->`), and edits it as its reviews start and finish. The workflow reads that line,
  from the Codex app's own comment only, and posts `success` once every review Codex started has completed, `pending`
  while one is running or when Codex has not reviewed at all ("comment @codex review"). It runs from `main` for every
  pull request whatever its base, on Codex's comments, on every `ci` run a push starts (so a new head gets its status
  without a new review), and by hand (`gh workflow run codex-finished -f pr=<n>`). It never checks out a pull request's
  code. Findings are review threads, which conversation resolution holds, so the status does not count them.
- **`builder-paths`** (a `ci.yml` job, `tools/ci/builder-paths.sh`): on a pull request whose head branch ends in
  `-build`, fails when the branch changes `e2e/**`, `examples/*/journeys/**`, `**/blueprint/journeys/**`,
  `packages/prove/src/modules/evals/**` or `examples/*/test/fixtures/evals/**`. The one exception is taking lines off
  `e2e/m1/expected-failing.txt`, which the ratchet asks of the pull request whose slice lands (`e2e/ratchet/README.md`);
  a line added there is a hit. Prove's journeys runner (`packages/prove/src/modules/journeys/`) is builder code and is
  not guarded. Authors' branches end in `-check` (Goal 3's naming, made the rule in `AGENTS.md`).
- **`supersedes`** (a step in `e2e-m0`, `tools/ci/supersedes.sh`): for each decision's `## Supersedes` list, in the shape
  `AGENTS.md` gives (`- <old doc>: "<old words>" → "<new words>"`), `git grep` must find each old phrase only in
  `design/decisions/` and `design/process/`. A line in the wrong shape fails too.
- **`cancel-closed`** (`.github/workflows/cancel-closed.yml`): when a pull request closes, merged or not, its unfinished
  `pull_request` runs are cancelled. It uses only the run's `GITHUB_TOKEN` with `actions: write`.

`tools/ci/ci.test.sh`, run in the `check` job, tests all three scripts on throwaway repositories.

## Where they reach

`codex-finished` runs from `main` for every pull request. The others run from the pull request's own copy of the
workflows, so they reach `m1` and `goal/stage-1` when `main` is next merged into them; a branch's required list names a
job only once that branch runs it.

## Undoing it

```bash
gh api -X DELETE repos/AaronAbuUsama/architect/branches/main/protection
```

The workflows and scripts come out with a revert of the pull request that added them.
