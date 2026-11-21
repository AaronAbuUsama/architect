# Where Orthograph stands

Snapshot of 21 November 2026, written by the Goal 3 lead's merge of `main` into `goal/stage-1`. Facts about pull
requests were read from `gh` that day. The board's data in `data/` is still the 19 November copy; the live board
(<https://claude.ai/artifact/4UH7mYegtpWM9rq4f1ZAJw>) is newer where the two differ, and this file is newer than `data/`.

## Read these first

- `AGENTS.md`: who decides, how work flows, the code's rules, Aaron's standing rules.
- `design/handoff.md`: the conductor's handoff, every line of work and its done-when.
- `design/milestones.md`: M0 to M8, every slice and tick. `design/decisions/K28-releases.md`: the three releases.
- `design/goals/03-stage-1-hill-climbed.md` and `design/goals/03-snags.md`: Goal 3 and its snag log.
- `design/ledger.md`: every known issue with its owning slice.

## The releases (K28, Aaron, 21 November)

| Release | Done when |
|---|---|
| **Preview** | Gate M1 passes on `main` and the packages are on npm under `next` (slice M1.51; Aaron signs in and runs `npm publish`) |
| **Beta** | Stage 1: Gate M2 plus the staging run, Goal 3's done check |
| **1.0** | The beta, then stages 2 to 4 (Goal 4 serves it) |

The preview lands mid-goal: once Gate M1's slices are green on `goal/stage-1`, one pull request takes that branch to
`main`, and Goal 3 carries on from its branch. The final merge at the done check stays as written.

## Stage 1 (Plugged In), Goal 3

- **The climb is green.** The seven Plugged In journeys run in CI, in local and in test (`e2e-stage1`, a required
  check on `goal/stage-1`, since #261). The grid has 331 of 331 cell-and-subject pairs green. M1's ticks and the ST1.09 to ST1.22
  invariants slices have landed on `goal/stage-1`.
- **Merged today:** S-30 (#254, the compiler refuses the retired `unique`), S-29 (#265, prove stops and names the error when the worker can't build), S-17's HAN-15 (#268, the answer-shape eval requires an issued token) and S-31 (#269, `b1d424e0`, the model and portal carry the rules each operation breaks; it replaced #255, closed).
- **Snags in flight:** S-27 (#264, a journey check that throws fails its step, not the run; the fix and its test; open, `e2e-m1` failing at the last read) and S-33 and S-34 (#278, new, their checks only: a refusal field of the wrong schema, two rule names that differ only in case; CI running).
- **Open blockers:** S-27 (#264) and S-11 (`prove --through cli|mcp`, which is M2.08 and follows M2.05). S-17's HAN-13 and
  HAN-14 are parked (M7.03; `later.md`, ST2.01).
- **M2:** M2.01 (#263, principals, roles and what auth and organizations own) is open, CI running. The M2.02 moved journeys (#267) have green checks and wait on #263. The staging checks (#266, M7.03 and M7.04) are open, e2e jobs pending.
- **M1 slices in flight:** M1.39 (#271, the canon's chains-and-wallets page; open, `check-static` failing at the last read). M1.12a: the build is #270 (`request.key` on the operation span; open, `e2e-m0` failing at the last read); a checks author is writing its check, to land as one pull request with the build. M1.49 (monitor, derived): in flight, checks first: a checks author is writing its check; no PR yet. M1.50 (one `Graph`): in flight, checks first: its check is #280 (open, new, CI running). Then Gate M1 (M1.15) and M1.51, the preview.
- **Next on the path:** #263, then M2.02, M2.03, M2.04, M2.05 (the identity plugin, the host's sign-in extraction),
  M2.08, then Gate M2.

## The UI layer (K29, PR #272, open and ready for review)

UI SDK is the base (K24). The pieces K29 adds to stage 1: **ST1.25** the web projection (replaces ST1.01),
**ST1.26** its checks, **ST1.27** the portal off HeroUI, **ST1.28** check 15 rewritten. **M1.22** and **M1.23** (the
actions projection and the port from agent-native) move into stage 1. K29 was decided in the pull request under Aaron's standing
authority of 21 November. A **Goal 5 lead** runs the UI work on `goal/ui-layer`, and Goal 5 waits on #272 merging. Not built yet.

## Goal 4 (on-chain, 1.0)

Started. `goal/on-chain` is protected like `goal/stage-1`. #273 is its start (stage 1 merged in, its snag log, the
branch's protection); #275 is slice 1b, the chain decision (M6.01, `M6-chain`). Its seam slice (the language and host
seam) waits on M2.05, because both reshape `host-cloudflare`.

## Decisions and IDs

K28 (releases) and F9 (Foreman, #187, merged today) are on `main`; K29 is on #272 (open). Ids taken off `main` by open pull requests: K30 (#185), G12 (#263),
`M2-auth` (#263, #267), `M6-chain` (#275, #276, #279). On `goal/stage-1` and `goal/on-chain`: M7 (`M7-cloud`), S31, W1 and W2.
The next free ids are **D5, E2, F10, G13, H3, K31, N2, O4, P2, R2, S32 and W3**; `design/handoff.md` has the full list and the
command that checks an id is free.

## Waiting on Aaron

- The npm publish at Gate M1 (his sign-in), and the licence for every published package.
- Rotating the HeroUI personal token printed on 18 November.
- Release credentials, each in writing (M7.13); the staging token's scope (M7.01).

## Open pull requests

| PR | Into | What |
|---|---|---|
| #263 | `goal/stage-1` | M2.01: principals, roles, what auth and organizations own (open, CI running) |
| #264 | `goal/stage-1` | S-27 fix and test (open, `e2e-m1` failing at the last read) |
| #266 | `goal/stage-1` | Staging checks (M7.03, M7.04) (open, e2e jobs pending) |
| #267 | `goal/stage-1` | M2.02 checks: moved journeys (open, checks green, waits on #263) |
| #270 | `goal/stage-1` | M1.12a build (open, `e2e-m0` failing at the last read; its check is being written) |
| #271 | `goal/stage-1` | M1.39 (open, `check-static` failing at the last read) |
| #277 | `goal/stage-1` | This merge of `main` and the state docs |
| #278 | `goal/stage-1` | S-33 and S-34 checks (open, CI running) |
| #280 | `goal/stage-1` | M1.50 check (open, new, CI running) |
| #272 | `main` | K29, the UI layer (open, ready for review) |
| #273, #275, #276, #279 | `goal/on-chain` | Goal 4's start; the chain decision; slice 2's journeys; its done check |
| #274 | `main` | M8 checks: name two dependency changes under Supersedes |

Merged today and off this list: #254, #265, #268, #269 (#255 was closed in favour of #269).

## Rules for rebuilding the board

`data/` is the board's last saved copy and is not refreshed here: the conductor saves a new one with
`scripts/snapshot.py` when the live board is reachable (see `SKILL.md`).
