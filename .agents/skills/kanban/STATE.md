# Where Orthograph stands

The conductor's state, written so that a fresh session (on this account or another one) can pick up the work without
the old conversations. Snapshot of 21 November 2026, 09:35 UTC, by the 🎛 conductor. Written because the week's Claude
usage was 71% spent and the work may move to another account. Sessions, Remote Control and claude.ai artifacts do not
move with the account. The repository does, so everything needed is here or linked from here.

## Pick up from here

1. Open a session in a fresh worktree of `AaronAbuUsama/architect` from `main`. Read `AGENTS.md`, this file,
   `design/scope.md` (what is built and what is left), `design/decisions/K28-releases.md` (the three releases), and
   `design/handoff.md`.
2. You are the 🎛 conductor (`.agents/skills/conductor/`, `.agents/skills/threads/`). List the open pull requests
   (`gh pr list`) and compare them with "The lanes" below. A lane whose lead is gone is restarted from its brief, as
   that lane's row says. Each lead keeps its own state in its goal's files on its branch, so read that first.
3. Snapshots of the claude.ai pages (the walkthrough board, the scope page, the to-do page, the grills) are in
   `design/artifacts/`. Republish any you need on the new account. The repository's design files stay the source of
   truth; the snapshots are pictures of them.

## The releases (K28, Aaron, 21 November)

- **Preview:** Gate M1 on `main`, and `@orthograph/*`, `orthograph` and the preset on npm under `next` (M1.51; Aaron
  runs `npm publish`). Goal 3's branch lands on `main` mid-goal once Gate M1's slices are green.
- **Beta** (stage 1, "workable"): Gate M2 and Goal 3's done check, staging included.
- **1.0:** the beta, then stages 2 to 4 and the release slices.

Aaron's aim (21 November): in about 72 hours, be ready to rebuild Capxul from the ground up on Orthograph, in
composable pieces (plugins) that another app (Plugged In, the link-in-bio app) also uses. So: parallelise wherever the
code allows.

## The lanes

Every lane runs as a goal: one lead, one branch, one done check, merged by pull requests that pass CI, have every
thread resolved and a 🔍 reviewer that wrote none of it. Leads merge `goal/stage-1` in at every slice start, never
rebase, and never push to another lane's branch.

| Lane | Branch | Brief (read it word for word) | Done check | Where it stood |
|---|---|---|---|---|
| 🎯 Goal 3: stage 1 of Plugged In (the beta, critical path) | `goal/stage-1` | `design/goals/03-stage-1-hill-climbed.md` | `nx run e2e:stage1`, staging included | 7 of 7 journeys green and a required check. Milestone 2 started: M2.01 (#263) in its third review, M2.02's checks (#267). Staging up and destroy (#282), request keys in traces (#270, #281), the chains page (#271), the graphs' checks (#280), two compiler snags from Goal 4 (#278), main merged in with K28 (#277) |
| 🎯 Goal 4: on chain, end to end (1.0) | `goal/on-chain` | `design/goals/04-on-chain.md` on its branch, and the lead's own skill and state (#284) | `nx run e2e:on-chain` in CI | Start-up (#273), the chain decision (#275), budgets journeys (#276), the done check, red (#279), slice 3's checks (#283). Its seam slice waits until Goal 3's M2.05 (auth out of the host) merges, because both reshape `host-cloudflare` |
| 🎯 Goal 5: the UI layer (generated pieces on UI SDK) | `goal/ui-layer`, from `goal/stage-1` | `design/goals/05-ui-layer.md` (in #272) | in the brief | Not started. K29 decided (#272, waits on K24 #217). Start its lead when #272 is on `main` |
| 🎯 Goal 6: the new portal (our components, the app map) | `goal/portal`, from `goal/stage-1` | `design/goals/06-portal.md` (in #285) | `nx run e2e:portal-next` | Not started. K31 drafted (#285). Start its lead when #285 is on `main` |

How Goals 5 and 6 meet the others (agreed 21 November):
- Goal 6 owns the Orthograph theme package (its first slice) and the app-map language. Goal 5 owns actions and
  `@orthograph/web`, and uses UI SDK's default tokens until the theme lands. Neither edits the other's packages.
- The app-map language is additive: new modules only in `orthograph` and the compiler, with byte-identical output for
  any blueprint that declares no app or pages, and a check that proves it.
- The new portal is a new package, `packages/portal-next`, reading the same data API. Every portal check runs against
  both clients, and the new client's failures sit in `e2e/portal-next/expected-failing.txt`, a list that may only
  shrink. When it is empty, the conductor and Goal 3's lead agree a freeze, and one cutover pull request into
  `goal/stage-1` swaps the assets, deletes the old client and HeroUI, and needs Goal 3's lead's yes.
- Goal 5's screens are part of Goal 3's done check. Its sign-in piece waits for the auth plugin (M2.05).

## Other threads

- 🗺 The walkthrough board (Aaron's "1 board, 6 zones"): the pitch, the concept map, the tour, swap the example, UI,
  hard questions; each card tinted by `design/scope.md`. Built; zone 5 (UI) is being filled by the UI thread. Snapshot in
  `design/artifacts/walkthrough-board.html`.
- 📐 The UI thread: K29 (#272), K31 and Goal 6's brief (#285). Hands both goals to the conductor to start.
- 🧭 "What Orthograph is" (#185, K30, and the goal in `README.md`): passed review; merges after K24 (#217).
- ✍ Time checks: done (#213 merged, a follow-up merged or in #274).
- Done and merged on 21 November: the scope map and K28 (#262), Foreman v0 (#187), the first spike (#215), time checks
  (#213).

## Waiting on Aaron

- **Two spikes, to start now in parallel** (the conductor's recommendation): a Safe with Hats Protocol and a module on
  Anvil (ST3.01, `spikes/safe-hats-module`), and durable workflows under workerd (M3.03, `spikes/effect-workflow-workerd`).
  Both are foundations of stage 3, the base for Capxul, and neither has been tried yet.
- **CI capacity** (see below): turn off "require branches to be up to date" on `main`.

## CI capacity (21 November)

The repository is public, so GitHub's runners are free with unlimited minutes; the limit is 20 jobs at once on a free
account, and each pull request runs about ten. Measured: about 800 job-minutes an hour across the lanes, and in one hour
33 of 54 pull request runs were cancelled because a newer commit or a base merge replaced them.

- **Blacksmith does not fit.** It works only on GitHub organisations, not personal repositories, and its free 3,000
  minutes a month would last about four hours at our rate; paid, it would be about $50 a day, over the $10 cap. Moving the
  repository to the Open-Harness organisation (free plan) gains nothing on GitHub's own runners either: an organisation
  on the free plan also gets 20 jobs at once.
- **What helps, for free:** fewer reruns. `main` requires branches to be up to date (`strict`), so every merge to `main`
  makes every open pull request rerun its whole CI; goal branches already have it off
  (`design/decisions/CI-branch-protection.md`). Leads test locally before pushing and push once, not per fix.
- **What helps, for a little money:** GitHub Pro on Aaron's account (about $4 a month) doubles it to 40 jobs at once.

## Decision IDs

Next free in `design/handoff.md`; reserved and in flight: K28 (releases, merged), K29 (UI layer, #272), K30 (the model and
the map, #185), K31 (the app map, #285). Slice IDs given out on 21 November: ST1.25 (the web projection), ST1.26 (its
checks), ST1.27 (retire the old portal client at cutover), ST1.28 (check 15 rewritten), M1.51 (the npm preview).

## Standing rules that bite

All of `AGENTS.md`, and especially: Aaron listens rather than reads (plain words, no bare IDs, pull request links);
never print, copy or write a key; never create a cloud credential without his written yes; at most $10 a day on cloud;
destroy every world, stage and site you make, touching only Orthograph-prefixed resources; no local Docker; stop only
your own processes, by PID; no attribution lines in commits, pull requests or comments; pins exact and at least three
days old. Aaron's standing authority (21 November): "anything that's waiting on me, just go with the recommendations.
You have authority." That covers design calls, not money, credentials, production or anything outward-facing.
