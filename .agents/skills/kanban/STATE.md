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
  check on `goal/stage-1`, since #261). The grid has 331 of 331 cells green. M1's ticks and the ST1.09 to ST1.22
  invariants slices have landed on `goal/stage-1`.
- **Snags merged today:** S-29 (#265, prove stops and names the error when the worker can't build), S-17's HAN-15 (#268,
  the answer-shape eval requires an issued token), S-30 (#254, the compiler refuses the retired `unique`).
- **Snags in flight:** S-27 (#264, a journey check that throws fails its step, not the run; a blocker) and S-31
  (#269, the model and portal carry the rules each operation breaks).
- **Open blockers:** S-27 and S-11 (`prove --through cli|mcp`, which is M2.08 and follows M2.05). S-17's HAN-13 and
  HAN-14 are parked (M7.03; `later.md`, ST2.01).
- **M2:** M2.01 (#263, principals, roles and what auth and organizations own) is in review. The M2.02 moved journeys
  (#267) passed and wait on #263. The staging checks (#266, M7.03 and M7.04) are merging.
- **M1 slices in flight:** M1.39 (#271, the canon's chains-and-wallets page; `check-static` failing at the last read),
  M1.12a (#270, `request.key` on the operation span; `e2e-m0` failing at the last read). M1.49 (monitor, derived) and
  M1.50 (one `Graph`) have no open pull request and no tick yet. Then Gate M1 (M1.15) and M1.51, the preview.
- **Next on the path:** #263, then M2.02, M2.03, M2.04, M2.05 (the identity plugin, the host's sign-in extraction),
  M2.08, then Gate M2.

## The UI layer (K29, PR #272, a draft awaiting Aaron's answers)

UI SDK is the base (K24). The pieces K29 adds to stage 1: **ST1.25** the web projection (replaces ST1.01),
**ST1.26** its checks, **ST1.27** the portal off HeroUI, **ST1.28** check 15 rewritten. **M1.22** and **M1.23** (the
actions projection and the port from agent-native) move into stage 1. A **Goal 5 lead** runs the UI work on
`goal/ui-layer`. Not built yet, and nothing in `packages/` changes until K29 is decided.

## Goal 4 (on-chain, 1.0)

Started. `goal/on-chain` is protected like `goal/stage-1`. #273 is its start (stage 1 merged in, its snag log, the
branch's protection); #275 is slice 1b, the chain decision (M6.01, `M6-chain`). Its seam slice (the language and host
seam) waits on M2.05, because both reshape `host-cloudflare`.

## Decisions and IDs

The next free decision id is **K30**. K28 (releases) is on `main`; K29 is on #272. `design/handoff.md` has the list.

## Waiting on Aaron

- K29's grill answers (#272).
- The npm publish at Gate M1 (his sign-in), and the licence for every published package.
- Rotating the HeroUI personal token printed on 18 November.
- Release credentials, each in writing (M7.13); the staging token's scope (M7.01).

## Open pull requests

| PR | Into | What |
|---|---|---|
| #263 | `goal/stage-1` | M2.01: principals, roles, what auth and organizations own (in review) |
| #264 | `goal/stage-1` | S-27 check |
| #266 | `goal/stage-1` | Staging checks (M7.03, M7.04) |
| #267 | `goal/stage-1` | M2.02 checks: moved journeys |
| #269 | `goal/stage-1` | S-31 build and checks |
| #270 | `goal/stage-1` | M1.12a |
| #271 | `goal/stage-1` | M1.39 |
| #272 | `main` | K29, the UI layer (draft) |
| #273, #275 | `goal/on-chain` | Goal 4's start; the chain decision |
| #274 | `main` | M8 checks: name two dependency changes under Supersedes |

## Rules for rebuilding the board

`data/` is the board's last saved copy and is not refreshed here: the conductor saves a new one with
`scripts/snapshot.py` when the live board is reachable (see `SKILL.md`).
