# CI-codex-advisory: Codex reviews when it can; the 🔍 reviewer is the gate

20 November 2026. Aaron's call: "We can't rely on Codex to be always there. Codex shouldn't be a gate. It should be
advisory." Applied by the conductor (branch protection) and a 🔨 builder thread (the written rules).

## Evidence

- **Since 19 November `codex-finished` was a required check** on `main`, `m1` and `goal/stage-1`
  ([`CI-branch-protection.md`](CI-branch-protection.md)). A pull request could not merge until Codex's summary comment
  said its review of the head, or of a commit the head only merged the base into, had completed.
- **Codex is not always there.** It hit its usage limit on #9, #19 and #28 (`design/ledger.md`, `PRC-09` and its review notes), and when it
  was there, long review loops held merges for hours while CI was already green and the 🔍 had passed.
- **What the gate was for is held elsewhere.** Unanswered findings were the real failure (two merged with their
  findings open, `design/process/patterns.md`); conversation resolution, still required, refuses a merge with any open
  review thread, Codex's included. The 🔍 reviewer, a subagent or thread that wrote none of the change, runs on every
  build pull request and every landing (`reviewer`, `conductor` and `threads` skills).

## Decision

1. **The merge rule:** CI green, no unresolved review threads, and a 🔍 reviewer pass from a reviewer that wrote none of
   the change. The 🔍 pass is the gate.
2. **Codex is advisory.** Ask for its review (`@codex review`) when it is available. Nobody waits on it. If Codex is
   down or slow, the pull request merges without it.
3. **Findings Codex posts before the merge are answered,** fixed with a check or answered with the ledger entry or
   decision that takes it, since conversation resolution still requires every thread resolved.
4. **`codex-finished` keeps running** (`.github/workflows/codex-finished.yml`, `tools/ci/codex-state.sh`,
   `tools/ci/codex-covers.sh`) as an advisory commit status, so anyone can see whether Codex has reviewed what will
   land. No branch requires it, so its `pending` never holds a merge.
5. **The author's hostile pass** (`author` skill, proof 6) runs before the first review of any kind, 🔍 or Codex, not
   before Codex in particular.
6. **Bring a branch up to date by merging its base in, never by rebasing,** still holds: a rebase rewrites the commits
   a reviewer already read, and `codex-covers.sh` reads a merge from the base as covered.

## What GitHub requires now

Set by the conductor on 20 November 2026, nothing else changed (`strict`, conversation resolution and
`enforce_admins: true` stand as in `CI-branch-protection.md`). Read with
`gh api repos/AaronAbuUsama/architect/branches/<branch>/protection`:

| Branch | Required checks |
|---|---|
| `main` | `check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `builder-paths` |
| `m1` | `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0` |
| `goal/stage-1` | `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `e2e-m1`, `e2e-climb`, `e2e-grid`, `builder-paths` |

The 🔍 pass is not a GitHub review (no required approvals, since the agents merge their own pull requests); it is the
rule in `AGENTS.md` and the skills, as it was before.

## Undoing it

Add `{ "context": "codex-finished" }` back to each branch's required checks (the `gh api -X PUT` in
`CI-branch-protection.md`) and revert this change's docs.

## Supersedes

- AGENTS.md: "Codex has finished and every review thread is resolved" → "every review thread is resolved and a 🔍 reviewer that wrote none of it has passed it"
- AGENTS.md: "since a rebase needs a fresh Codex review" → "so the commits a reviewer already read keep their identity"
- .agents/skills/conductor/SKILL.md: "Codex has finished, and every review thread is resolved" → "Every review thread is resolved"
- .agents/skills/conductor/SKILL.md: "comment `@codex review` and wait for it" → "comment `@codex review` when it is available and answer what it posts before the merge, but never wait on it"
- .agents/skills/author/SKILL.md: "A hostile pass, before Codex." → "A hostile pass, before the first review."
- .agents/skills/author/SKILL.md: "planted, before the first "@codex review"" → "planted, before any reviewer (🔍 or Codex) is asked to look"
- .github/workflows/codex-finished.yml: "is a landing condition. This workflow posts a commit" → "Advisory only (design/decisions/CI-codex-advisory.md, 20 November 2026)"
- .github/workflows/codex-finished.yml: "Branch protection requires it, so a" → "No branch requires it, so a pending status never holds a merge"
- CI-branch-protection.md: "plus the `codex-finished` status." → "plus the `codex-finished` status (no longer required)."
- CI-branch-protection.md: "is added to a branch only once it has been seen posted on a real pull request into that branch," → "required on no branch"
