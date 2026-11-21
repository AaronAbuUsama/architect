# Goal 5: the UI layer, on UI SDK

Branch `goal/ui-layer`, cut from `goal/stage-1`. Written 21 November 2026 with K29.

## Aaron's words

On 21 November 2026 Aaron asked for the UI layer to be designed on UI SDK, with HeroUI phased out (K24). The four
questions it raised were answered 1A 2A 3A 4A by the conductor, under the standing authority he gave it that day:
"anything that's waiting on me, just go with the recommendations. You have authority." So actions come into stage 1,
the screens are built from generated pieces, HeroUI leaves the portal in one change, there is one Orthograph theme on
UI SDK's tokens, and the beta generates React only ([`../decisions/K29-ui-layer.md`](../decisions/K29-ui-layer.md)).

## What this goal proves

A blueprint gives a web app its interface the way it gives the CLI and MCP theirs: derived, never hand-configured.

1. **Every operation has a generated piece.** One action per operation does the call, and one UI SDK piece per
   operation and read binds a form to it, with the declared refusals, the pending state and the agent's rules built in.
2. **A page is composition.** Plugged In's three screens are its own short code in `src/web/`, built from the pieces
   and UI SDK's components, with one component of its own (the link list).
3. **People and agents use the same page.** An agent in the browser sees every control by name, waits for a person's
   yes where one is declared, and is refused with the same code a person sees.
4. **No licence anywhere.** The portal runs on UI SDK, and nothing in the repository installs HeroUI.

## The words

- **An action** is one generated file per operation that does the call: the caller, the payload check, a refusal as a
  value, and an approval when one is declared (M1.23, M1.22).
- **A piece** is one generated UI SDK primitive per operation or read, bound to its action, with React parts beside it
  (`generated/web/<thing>/<verb>.ts` and `.react.tsx`). It is a move, a write or a read, worked out from the model.
- **`@orthograph/web`** is the package every piece shares: the browser host, the piece runtime and the Orthograph theme.

## The prompt

> You lead Goal 5 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/ui-layer`, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/K29-ui-layer.md` (the whole shape, with sketches), K24, K13 and K28;
> - `design/ui/heroui-inventory.md` (every HeroUI use, with what replaces it);
> - `design/frame/projections.md` 3.4 (the web projection) and the M1.22, M1.23, ST1.01, ST1.04, ST1.25 and ST1.26
>   rows of `design/milestones.md`;
> - `spikes/ui-sdk-real-world/` (#222) and `spikes/ui-sdk-verb-primitive/` (#215), their READMEs first;
> - the `ui-sdk`, `conductor`, `reviewer`, `author`, `threads` and `kanban` skills.
>
> - **Branch:** `goal/ui-layer`, cut from the tip of `goal/stage-1` when this goal starts.
>   - Every change reaches it through a pull request into `goal/ui-layer`. Merge each one when CI is green and a 🔍
>     reviewer that wrote none of it has passed it.
>   - Merge `origin/goal/stage-1` into `goal/ui-layer` at the start of every slice: by a merge, never a rebase. Never
>     push to `goal/stage-1`.
>   - Goal 3 owns `goal/stage-1` and never waits on you. Resolve every conflict on your side, keeping Goal 3's intent.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same slice.
> - **Ownership:** you own the architecture, as `AGENTS.md` says. Where code and design disagree, decide, fix the
>   other in the same change, and record it.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each slice's card on
>   the board (the `kanban` skill), so a fresh or compacted session continues where you stopped.
> - **Reporting:** each time a slice merges, report to the conductor session (the `threads` skill names it), in two or
>   three lines: the slice, its check, its snags. Write for Aaron's ear.
> - **Branch protection:** ask the conductor to protect `goal/ui-layer` like `goal/stage-1` before the first pull
>   request (`design/decisions/CI-branch-protection.md`): its CI jobs must pass and every conversation be resolved.

## The bound

- **Inside:** the slices below, the framework work they need, and `examples/plugged-in/src/web/` (the three screens and
  the link list), which this goal owns. New packages and folders: `packages/web` (`@orthograph/web`), the actions
  module in `orthograph`, the actions and web projections, and the generators' templates for them.
- **Outside:**
  - the rest of `examples/plugged-in` (its blueprint, journeys, handlers and auth) and every Goal 3 journey and check;
  - the shell's chat and "Needs you" (M1.24), MCP from the whole model (M1.37) and the host's caller for actions outside
    our portal (ST1.05): all still M3;
  - frameworks other than React (Q4), server rendering, and a lighter client than the generated SDK (`later.md`).
- **Local, never fake:** Chromium through Playwright for every browser check, never jsdom; real workerd and D1 under
  `ortho prove`. No cloud, no Docker, no keys.
- **Dependencies:** `@ui-sdk/*` pinned exactly, at least three days old (R1). K24 pins beta.7; beta.10 qualifies from
  21 November and beta.13 from 22 November. Moving the pin is its own pull request, which re-reads the vendored skill
  (`.agents/skills/ui-sdk/README.md`, "Updating it").
- **Goal 3's hotspots** (from its open pull requests on 21 November 2026). Merge often, and keep each slice small where
  it touches them:
  - the portal's pages (`packages/portal/src/modules/pages/internal/`, `wire/`, `telemetry/`): S-31 adds each
    operation's rules (#269) and M1.12a adds the request key to the calls table (#270). ST1.26's first half stays
    inside `packages/portal-ui` and `portal.css`; its second half (the frame's parts as UI SDK's) touches these files,
    so it waits for both to merge, or merges them in first;
  - the compiler's model (#269, and ST1.14 to ST1.16 before it): the actions and web projections read the model and
    never change it. A field they need that the model lacks is a snag for Goal 3, not an edit here;
  - `orthograph`'s front door (ST1.14): M1.23's actions module sits beside it, so merge before touching the module
    index;
  - `examples/plugged-in` and `e2e/` (#267, the journeys): this goal writes only `examples/plugged-in/src/web/` and its
    own checks;
  - the expected-failure lists.
- **Cloud spend: $0.**
- **At most three builders at once.** Every agent stops the processes it starts, by PID, before it reports.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Checks author** | each slice's failing check, first, on a `-check` branch, including check 15's rewrite and the `e2e:ui-layer` target | handlers, the framework, the journeys, `src/web/` |
| **Framework builder** | `packages/`, on a `-build` branch, to turn a check green | the journeys, any check, `src/web/` |
| **User** (the DX trial) | only `examples/plugged-in/src/web/`, using only what a user has: the generated pieces, UI SDK, the `ui-sdk` skill, the generated docs | the blueprint, the journeys, `packages/`, any check, `generated/` |
| **Goal 3** | Plugged In's blueprint, journeys and handlers, on `goal/stage-1` | this goal's branch |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the user is stuck on something it can't fix inside `src/web/`, it writes a snag in `design/goals/05-snags.md` and
moves on. It never writes a fetch, a hand-made form or a HeroUI import to get round a piece. The lead creates
`05-snags.md` in slice 1, in the shape of `03-snags.md`:

```md
## S-02 · ui · "the claim form can't show who holds the name"
- Hit: the user, writing `src/web/claim.tsx`: `HandleTaken` reaches the piece with its code but not its holder.
- Lost: 2 tries, 8 minutes.
- Cause: the piece's refusal part renders the code and message only.
- Fix: framework, the refusal part renders the declared fields an agent may see (PR #…). Docs: the piece's page.
- Status: fixed
```

## The slices

Each slice starts with its check, written first and failing, and ends with that check green on `goal/ui-layer`.

### Part 1: start today, beside Goal 3

These touch only `packages/portal-ui`, `portal.css`, CI, lint and new code, none of what Goal 3 is changing.

| # | Slice | Done when |
|---|---|---|
| 1 | **ST1.25, the checks for the portal off HeroUI** (checks author): check 15 rewritten, a planted HeroUI import fails lint, the portal builds with `HEROUI_AUTH_TOKEN` unset; and the `e2e:ui-layer` target, red until the goal is done | they fail on `goal/ui-layer` for HeroUI's imports only; checks 21, 26, 27 and 28 still pass |
| 2 | **ST1.26, first half: inside `portal-ui`.** `Card` and `Widget` as our markup, `Timeline` as UI SDK's, `portal.css` on the Orthograph theme (`@orthograph/web/theme.css`, created here), the 15 unused names deleted, HeroUI's peers, scripts, CI step and cache removed (K29 section 7, items 1, 3 and 4) | ST1.25's checks pass; checks 21, 26, 27 and 28 still pass |
| 3 | **M1.23, the actions module** in `orthograph`, in Effect, agent-native's field names | M1.23's check |
| 4 | **ST1.01's checks** (checks author), on Plugged In, against empty pieces: a name claimed once `--through web`, `HandleTaken` with `HN-001` under the field and failing an agent's step, a release that waits for a person's yes, a read that loads again after a write, pending observed before the answer | they fail with the web projection empty |

### Part 2: after Part 1, merging Goal 3 in often

| # | Slice | Done when |
|---|---|---|
| 5 | **M1.22, the actions projection**: one generated action per operation in `generated/actions/` | M1.22's check |
| 6 | **ST1.01, the web projection**: `@orthograph/web` (the browser host and the piece runtime), the pieces' templates, `--through web` in Chromium, and `ortho/no-ui-in-worker` carved out for `generated/web/` with check 26 still holding the Worker line (K29 sections 3 and 6) | ST1.01's checks from slice 4 |
| 7 | **ST1.26, second half: the frame's parts as UI SDK's** (search, the environment picker, the tree, the tabs, the calls filter), each keeping its `data-portal` hook. Waits for #269 and #270 to reach `goal/stage-1` | ST1.26's check: an agent's `snapshot()` on the portal lists the search, the tree and the tabs by name |
| 8 | **ST1.04's three screens** (the user): `/@name`, `/claim` and `/edit` in `examples/plugged-in/src/web/`, built on the pieces, with the app's own link list (K29 section 5). Needs ST1.03, Goal 3's handles plugin, on `goal/stage-1` | in Chromium a claim and a link show on `/@aaron`; Plugged In's claim, links and page journeys pass `--through web` |

### Where it meets Goal 3

- **The screens are part of Goal 3's done check.** `nx run e2e:stage1` needs every stage 1 journey green, and ST1.04
  is a stage 1 slice. Goal 3 builds ST1.04's `profile`, `link` and handlers; this goal builds its screens. Slice 8
  lands in `goal/stage-1` before Goal 3 can finish.
- **The sign-in piece waits for the auth plugin.** Signing in on a page needs `@orthograph/auth`'s identity (M2.05) and
  its ways in (M2.06), both Goal 3's. Until they land, the screens claim and edit as the test people Plugged In's
  journeys already use. ST1.06 (the pieces behind a signed-in session) is built after M2.06, in whichever goal is open
  then; it is not in this goal's done check.
- **Goal 3 changes nothing here.** It never waits on this goal, and its portal and model work merges in at every slice.

## Decision IDs

The lead keeps this list (the `threads` skill: decision IDs come from one allocator; on a goal, the goal file). Ask the
lead for the next one before writing a decision file on this branch. None is reserved yet: K29 settles the shape, and a
question the slices raise gets the next free ID from `design/handoff.md`.

| ID | File | Taken by |
|---|---|---|

## The done check

```bash
nx run e2e:ui-layer
```

It passes only when all of these hold, in CI on `goal/ui-layer`:
- ST1.25's and ST1.01's checks, and M1.22's and M1.23's, are green;
- Plugged In's claim, links and page journeys pass `--through web`, with their test people, and the same verdicts as
  over HTTP;
- in Chromium a claim and a link show on `/@aaron`, built from the pieces, with no fetch in `src/web/`;
- the portal and every package build with `HEROUI_AUTH_TOKEN` unset; no `package.json` and no lockfile names
  `@heroui`, and nothing in `packages/` or `examples/` imports it;
- checks 21, 26, 27 and 28 still pass, and acme's and Plugged In's existing generated files are unchanged (only
  `generated/actions/` and `generated/web/` are new);
- every snag in `05-snags.md` is fixed, or parked with an owner and a reason.

## Landing

Two merges, both into `goal/stage-1`, since Goal 3 is open and its done check needs the screens.
- **The portal, early.** Once slice 2 is green, open one pull request from `goal/ui-layer` into `goal/stage-1`, so Goal
  3's portal work builds on UI SDK from then on. Merge `goal/stage-1` in first, by a merge. It merges when CI is green
  and a 🔍 reviewer that wrote none of it passed it.
- **The rest, at the done check.** When `nx run e2e:ui-layer` passes, open one more pull request into `goal/stage-1`.
  It merges when CI is green, Goal 3's checks still pass on it, and a 🔍 reviewer has passed the whole branch, reading
  this file, the snag log, each slice's check and the evidence below. It reaches `main` with stage 1.

## Evidence for Aaron

- **The DX trial:** what a person writes, in full (Plugged In's `src/web/`), beside what was generated for it.
- **A browser video,** recorded by Playwright, of a claim, a taken name refused under the field, three links added and
  ordered, and the public page; then the same flow driven by an agent in the browser, waiting for a yes on release.
- **The portal,** a screenshot of every page at desktop width, before and after HeroUI leaves.
- **The snag log,** each snag linked to its fix, and each slice's check with its run.

## Estimate

From Goal 3's pace (a medium slice takes three to six hours from opening to merge, checks first).
- Part 1: about 8 to 12 hours. The portal change is small (three components used, K29 section 7), and M1.23 is a small
  slice with agent-native's shape already spiked.
- Part 2: about 16 to 24 hours. The web projection is the new machinery; #222 proved each part by hand.
- Both: about 24 to 36 hours of continuous running, with slice 8 waiting on Goal 3's ST1.03.
