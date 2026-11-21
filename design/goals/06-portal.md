# Goal 6: the new portal, on our own components and the app's map

Branch `goal/portal`, cut from `goal/stage-1`. Written 21 November 2026 with K31, on terms agreed with the conductor the same day.

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 6. Read `design/goals/06-portal.md` and run
it." Nothing else is needed.

## Aaron's words, 21 November 2026

After the app map grill ("I agree with all of your defaults"), to the 📐 designer thread: kick off a new goal "against
the new portal", so the old portal is deprecated and "this is the new portal built from our own components", and "I
want this to be able to run in parallel to the other work that's actually running."

## What this goal proves

1. **The map falls out.** An app declares its map in the blueprint (K31), and the router, the shell, the palette, the
   breadcrumbs and the agent's map (as data) come from it. The rest of K31's table, the docs' page per screen,
   `ortho add page`, the agent's `map` tool on an app and `open(pages.x)` in `ortho prove`, is not in this goal; it is
   in `design/later.md`, "The rest of the app's map".
2. **Our own components are enough.** The portal is rebuilt on UI SDK, the Orthograph theme and our shell, with no
   HeroUI and no licence anywhere.
3. **Nothing is lost.** Every check that holds the old portal passes on the new one before the old one goes.
4. **An agent can use the portal,** by name, through UI SDK's bridge.

## The words

- **The old client** is today's portal client in `packages/portal` (on HeroUI Pro through `@orthograph/portal-ui`).
  **The new client** is `packages/portal-next`. Both are served by the same server half
  (`@orthograph/portal/server`: the data API at `/_portal/v1/*` and a prebuilt client passed in as `PortalAssets`).
- **The parity list** is `e2e/portal-next/expected-failing.txt`: every portal check that does not yet pass on the new
  client, one per line.
- **Cutover** is the one change that serves the new client at `/portal` and deletes the old one.

## The prompt

> You lead Goal 6 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/portal` and cutover has landed, or until you are truly blocked as `AGENTS.md` defines it.
>
> This file is the whole brief: it holds every agreement this goal depends on (below, "The agreements"), so a lead
> starting cold, on any account or session, needs only the repository. Read "Where it stands" at the end first, and
> rewrite it at every slice merge. You coordinate yourself, through the repository and GitHub only ("How this goal
> coordinates", below); `.agents/skills/kanban/STATE.md` says where the whole project stands.
>
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/K31-app-map.md` (the map), `K29-ui-layer.md` (the pieces, UI SDK), `K32-goals-coordinate-themselves.md` (how goals coordinate) and `K19-portal-prebuilt.md` (the portal's
>   server and client line), and `design/ui/heroui-inventory.md` (every part of the old client, with what replaces it);
> - `design/portal.md` (the agreed information architecture: keep it; this goal changes how the portal is built, not
>   what it shows) and the `portal-design` skill (the process and the style guide);
> - `e2e/m1/21-portal-viewer.test.ts`, `28-st1-22-rules-in-the-portal.test.ts`, `e2e/served-portal/` and the grid's
>   portal evals: the checks that hold the old client;
> - the `ui-sdk`, `reviewer`, `author`, `threads`, `kanban` and `portal-design` skills.
>
> - **Branch:** `goal/portal`, cut from the tip of `goal/stage-1` when this goal starts.
>   - Every change reaches it through a pull request into `goal/portal`, merged when CI is green and a 🔍 reviewer
>     that wrote none of it passed it.
>   - Merge `origin/goal/stage-1` into `goal/portal` at the start of every slice, by a merge, never a rebase. Never push
>     to `goal/stage-1`.
>   - Goal 3 owns `goal/stage-1` and never waits on you; Goal 5 runs beside you. Resolve every conflict on your side,
>     keeping their intent.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same slice.
> - **Ownership:** you own the architecture, as `AGENTS.md` says. Where code and design disagree, decide, fix the other
>   in the same change, and record it.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each slice's card on
>   the board (the `kanban` skill), and rewrite "Where it stands" in the same pull request.
> - **Ownership between goals:** Goal 5 owns the actions, `@orthograph/web` and the web projection; you own the map, the
>   shell, the theme and the new client. Neither goal edits the other's packages.
> - **Reporting:** "Where it stands", rewritten in the pull request that merges each slice. Nobody is messaged.
> - **Cutover follows the protocol, point 5.** Never merge cutover into `goal/stage-1` without the freeze and the yes it
>   names.
> - **Branch protection** is set on `goal/portal` before this goal starts, like `goal/stage-1`
>   (`design/decisions/CI-branch-protection.md`). If `gh api repos/AaronAbuUsama/architect/branches/goal/portal/protection`
>   finds none, it needs an admin: write that in "Where it stands" and stop before the first pull request.

## The bound

- **Inside:** the theme (`packages/theme`, `@orthograph/theme`), the map language (K31) as new modules in `orthograph`
  and the compiler, the app projection (`generated/app/`), the shell (`packages/shell`, `@orthograph/shell`), the new
  client (`packages/portal-next`), its checks, and cutover.
- **The core-language rule.** The map comes in as new modules only. No existing module is edited beyond registering
  the new ones, and a blueprint that declares no app and no pages generates byte-identical output. These are the only
  existing files this goal may touch before cutover, and only as said:

  | File | Only this |
  |---|---|
  | `packages/orthograph/src/index.ts` | spread the new `app` module into the `Blueprint` object and export its types |
  | `packages/compiler/src/modules/model/service.ts` | set the `blueprint/app/` files aside before `readLayout`, and call the new `app` module after `describe`, adding `app` to the model only when one is declared |
  | `packages/compiler/src/modules/model/types.ts` | `readonly app?: AppModel` on `Model`, "present only when the blueprint has an `app/` folder", the type imported from the new module |
  | `packages/projections/src/main.ts` | export the `app` projection |
  | `.oxlintrc.json` | the module-boundary tags `scope:theme`, `scope:shell` and `scope:portal-next`, for `packages/theme/`, `packages/shell/` and `packages/portal-next/` |
  | `e2e/served-portal/` | the checks author's `PORTAL_CLIENT=old|next` switch, the old client the default |
  | `e2e/project.json`, `e2e/package.json` | the `portal-next` target and the new packages as workspace dependencies |
  | `.github/workflows/ci.yml` | one job that runs the portal checks against the new client, not yet blocking |
  | `pnpm-lock.yaml` | what `pnpm install` writes for the above |
  | `design/handoff.md`, `STATE.md`, the board, `design/milestones.md` | this goal's own lines |

  A change that needs any other existing file is a snag for its owner (a line in its snag log, or an issue with its
  label), never an edit here.
  The new modules are `packages/orthograph/src/modules/app/` (`Blueprint.app`, `Blueprint.page`, `Blueprint.layout`,
  `Blueprint.nav`; a page's type is `AppPage`, since `Page` is already a read's page of results),
  `packages/compiler/src/modules/app/` (`model.app`, its hash and the four refusals) and
  `packages/projections/src/modules/app/` (the app projection); the new packages are `packages/theme`,
  `packages/shell` and `packages/portal-next`.
- **Outside, never edited before cutover:** `packages/portal` (the old client, the wire and the server half),
  `packages/portal-ui`, the actions, `@orthograph/web` and the web projection (Goal 5's), Plugged In, and every Goal 3
  journey and check. Only cutover's own pull request touches `packages/portal` and `packages/portal-ui`.
- **The information architecture stays** as `portal.md` agreed it, so no new UX grill. A screen the old client lacks
  (the map's tree, the agent's view) is drawn first, by the `portal-design` process, and shown to Aaron before it is
  built (his rule: ask before drawing UX).
- **Local, never fake:** Chromium through Playwright, the real served portal over a real data API, the `TraceSource`
  fixture check 21 already uses. No cloud, no Docker, no keys. **Cloud spend: $0.**
- **Dependencies:** `@ui-sdk/*` at the workspace's pin (R1); nothing else new without a line in R1.
- **At most three builders at once.** Every agent stops the processes it starts, by PID, before it reports.

## Keeping up with Goal 3 (the protocol)

Goal 3 keeps changing the old client while this goal runs (today: the rules each operation breaks, #269; the request
key in the calls table, #270). So:

1. **Merge in at every slice.** Start each slice by merging `origin/goal/stage-1`.
2. **Same checks, two clients.** The checks author makes `e2e/served-portal` serve either client
   (`PORTAL_CLIENT=old|next`), and every portal check (21, 28, the grid's portal evals, and any added later) runs
   against both in CI. The old client stays the blocking one until cutover.
3. **The parity list only shrinks,** with one exception: a portal check that arrives by a merge from `goal/stage-1`
   lands red on the new client, and the merge adds its line. So anything Goal 3 adds to the old portal is owed by the
   new one automatically, and nothing is forgotten.
4. **Data goes through Goal 3.** The new client reads the data API and the wire types as they are. A field it needs and
   the API lacks is an additive request to Goal 3, a line in `03-snags.md` or an issue labelled `goal-3`, never an edit
   here.
5. **The cut-off, on GitHub.** When the parity list is empty and the done check passes:
   - **The freeze.** The lead opens a pull request into `goal/stage-1` that adds one line to Goal 3's brief
     (`design/goals/03-stage-1-hill-climbed.md`, under its "Where it stands", or at its end if it has none): "The old
     portal client is frozen for Goal 6's cutover: add nothing to it; portal work goes to `packages/portal-next`."
     It is labelled `goal-3`. Goal 3's lead merging it is the freeze.
   - **The cutover.** Only then, the cutover pull request into `goal/stage-1`, labelled `goal-3` and asking Goal 3's
     lead in its description. It merges once Goal 3's lead has written its yes on it and a 🔍 reviewer has passed it.
     (Every agent here works under one GitHub account, so the yes is a comment, not a formal review.)
   - From then on all portal work goes to the new client.
6. **One owner for each shared piece.** The theme is this goal's, built first and landed early, so Goal 5's screens
   take it up; until it lands, Goal 5's pieces use UI SDK's default tokens. The actions and `@orthograph/web` are Goal
   5's. Neither goal edits the other's packages; a need on the other side is a line in its snag log or an issue
   with its label.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Checks author** | each slice's failing check, first, on a `-check` branch; the two-client runner and the parity list's first lines | the framework, the new client's code, the journeys |
| **Framework builder** | the map language, the compiler checks, the app projection, `@orthograph/shell`, `@orthograph/theme`, on `-build` branches | any check, the new client's pages |
| **Portal builder** | `packages/portal-next` only, the way an app's author would: its `blueprint/app/`, its pages, its components | `packages/` outside it, any check |
| **Designer** | a screen the old client lacks, drawn first and shown to Aaron (`portal-design`) | code |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the portal builder is stuck on something it can't fix inside `packages/portal-next`, it writes a snag in
`design/goals/06-snags.md` (created in slice 1, the shape of Goal 3's snag log) and moves on. It never works around the map
or the shell from inside the client.

## How this goal coordinates (K32)

This goal coordinates itself. It talks to Goal 3, Goal 5 and any other goal only through the repository and GitHub,
never through a chat or a coordinating session ([`../decisions/K32-goals-coordinate-themselves.md`](../decisions/K32-goals-coordinate-themselves.md)).

- **Where it stands.** The lead rewrites "Where it stands" at the end of this file in every pull request that merges a
  slice: the slice, its check, the parity list's length, what is next, open snags, in two or three lines written for
  Aaron's ear. That is the report; nobody is messaged.
- **Asking another goal for something.** Add a line to that goal's snag log (`design/goals/03-snags.md` for Goal 3,
  `05-snags.md` for Goal 5) by a pull request into its branch, or open a GitHub issue with its label (`goal-3`,
  `goal-5`). Never edit its files to get around it.
- **Asks to this goal** arrive the same way: at the start of every slice, read `06-snags.md` and the open issues
  labelled `goal-6` after merging `goal/stage-1` in, and answer each one in the slice that handles it.
- **Decisions** this goal makes are named `GOAL6-<slug>` (`GOAL6-theme.md`), so they never collide with another goal's;
  each is listed under "Decision IDs" below and in `design/handoff.md`'s list.
- **Changing an agreement** below is one pull request that edits this brief and the other goal's together, and merges
  only with that goal's lead's yes written on it.

## The agreements (21 November 2026)

Made by the conductor and the 📐 designer thread, under Aaron's standing authority, when this goal was split from
Goal 5. They hold whoever leads either goal; changing one is a pull request that edits this brief and Goal 5's
together.

1. **The theme is this goal's,** built as slice 1 and landed in `goal/stage-1` on its own. Until it lands, Goal 5's
   pieces use UI SDK's default tokens; Goal 5's screens slice takes it up.
2. **The app-map language is additive** (the core-language rule in the bound): new modules only, registered in the
   named files, and byte-identical output for a blueprint with no app and no pages, proved by slice 2's check.
3. **Neither goal edits the other's packages.** Goal 5 owns the actions module, `packages/web`, the actions and web
   projections and Plugged In's `src/web/`; this goal owns `packages/theme`, `packages/shell`, `packages/portal-next`,
   the app projection and the `app` modules. A need on the other side is a line in its snag log or an issue with
   its label, never an edit.
4. **Goal 5 never waits on the map.** Plugged In's pages are declared in the map language as a follow-on, after the
   map landing.
5. **The parity list only shrinks,** except for a portal check that arrives by a merge from `goal/stage-1`, which lands
   red with its line (the protocol, point 3).
6. **Cutover, on GitHub:** when the list is empty, Goal 3's lead merges the freeze into Goal 3's brief; then the
   cutover pull request into `goal/stage-1` merges with Goal 3's lead's yes and a 🔍 pass (the protocol, point 5).
7. **Goal 5's waits are not this goal's:** its screens wait on ST1.03 and its sign-in on M2.05 and M2.06, both Goal
   3's. Nothing here waits on Goal 5.

## The slices

Each slice starts with its check, written first and failing, and ends with it green on `goal/portal`.

### Part 1: the theme and the map, beside everyone (none of it touches Goal 3's or Goal 5's files)

| # | Slice | Done when |
|---|---|---|
| 1 | **The theme.** `@orthograph/theme`: one stylesheet on UI SDK's `--ui-*` tokens (K29 Q3), the type scale and spacing, light and dark; the snag log | its check (written first): a fixture page on it in Chromium resolves every `--ui-*` token to the theme's value, in both schemes, and builds with `HEROUI_AUTH_TOKEN` unset |
| 2 | **The checks.** The two-client runner, `nx run e2e:portal-next`, the parity list (every portal check, all red), and the map's own checks: the compiler's four refusals (K31), a page that shows no read and types its parameter with a value (the portal's case: `/things/:name` over the data API) compiling, a derived default map for a fixture with no `app.ts`, typed links, a palette that lists only what the caller may open and call, and **the byte-identical check**: acme's and Plugged In's `model.json` and every generated file equal `goal/stage-1`'s, byte for byte, with the map modules in | they fail with the map empty, except the byte-identical check, which passes and must keep passing; the old client's checks still pass |
| 3 | **The map language.** `Blueprint.app`, `Blueprint.page`, `Blueprint.layout`, `Blueprint.nav` in `orthograph`'s new `app` module; `model.app` in the compiler's new `app` module, hashed; the four compile errors; registered in the four files the bound names | slice 2's language and compiler checks; the byte-identical check |
| 4 | **The app projection.** `generated/app/`, for a project that mounts it: the route table, a typed link per page, the navigation, the palette's index and the agent's map, as data; with no `app.ts`, the derived default, worked out here and never written into the model | slice 2's projection checks; the byte-identical check |
| 5 | **The shell.** `@orthograph/shell`: the router over the route table, the layouts (`sidebar`, `topNav`, `none`) and their slots, the navigation, the breadcrumb and the ⌘K palette, on UI SDK (`navigation-menu`, `collapsible`, `scroll-area`, `command`, `menu`) and the theme | slice 2's shell checks in Chromium; an agent's `snapshot()` on a fixture shell lists its navigation and palette by name |

**The theme landing, after slice 1:** one pull request from `goal/portal` into `goal/stage-1` carrying only
`packages/theme`, its check and the bound table's lines it needs (`scope:theme` in `.oxlintrc.json`, the lockfile,
its `e2e/project.json` target), so Goal 5's screens take it up. Merge `goal/stage-1` in first. It merges when CI is
green and a 🔍 reviewer passed it.

**The map landing, after slice 5:** the same, for the map language, the app projection and the shell, so Plugged In's
pages can declare themselves (Goal 5's follow-on). The byte-identical check must pass on it. It registers the new
modules in `orthograph`'s index and the compiler's model service, which are Goal 3's busiest files, so tell Goal 3's
lead before it opens (a line in `03-snags.md`, or an issue labelled `goal-3`), and merge `goal/stage-1` in last
thing.

### Part 2: the new client

| # | Slice | Done when |
|---|---|---|
| 6 | **The frame.** `packages/portal-next`: its `blueprint/app/` declaring `portal.md`'s map (home, things, operations and their five tabs, environments, compare, journeys, starting worlds, reference, plugins, monitor, traces), the top bar (environment picker, ⌘K), the rail and its panels, the tree, the live rail, each keeping its `data-portal` hook | check 21's frame clauses leave the parity list |
| 7 | **Home, things and operations** (the contract, metrics, proof, docs and notes tabs) | their lines leave the list |
| 8 | **Environments, compare, journeys, starting worlds** | their lines leave the list |
| 9 | **Reference, plugins and the rules** (check 28) | their lines leave the list |
| 10 | **Monitor and traces** (a trace on UI SDK's `Waterfall`, or ours if it is still experimental) | their lines leave the list; the screenshots are byte-identical across two runs |
| 11 | **The agent's portal.** The agent's map tool on the portal; every control by name | an agent's `snapshot()` lists the search, the tree, the tabs and the environment picker by name |

### Part 3: cutover

| # | Slice | Done when |
|---|---|---|
| 12 | **Cutover (ST1.27)**, after the cut-off (the protocol, point 5). Check 15 rewritten first by a checks author (ST1.28); then one pull request into `goal/stage-1` that serves `portal-next` at `/portal`, deletes the old client, `@orthograph/portal-ui`, HeroUI and the licence machinery (`pro.mjs`, `sheets.mjs`, the CI step and cache, `ortho/no-pro-outside-portal-ui`), folds `e2e:portal-next` into the normal portal checks, and rewrites every live doc line that still names `portal-ui` or HeroUI as current (`git grep -n "portal-ui\|HeroUI"` outside `design/decisions/`, `design/history/` and `design/process/`: the `portal-design` skill, `design/walkthrough/journey.md`, `design/ui/heroui-inventory.md` section 8, `portal.md`, `packages.md`), with a Supersedes list. It merges after the freeze, with Goal 3's lead's yes and a 🔍 pass | every portal check passes on the one client; check 15 passes; the portal builds with `HEROUI_AUTH_TOKEN` unset |

## Decision IDs

A decision this goal makes is named `GOAL6-<slug>` (K32), never a number, so no allocator is needed: the lead lists
each one here and in `design/handoff.md`'s list, in the pull request that adds it.

| ID | File | Taken by |
|---|---|---|
| K31 | `design/decisions/K31-app-map.md` | the 📐 designer, before this goal started |

## The done check

```bash
nx run e2e:portal-next
```

It passes only when all of these hold, in CI on `goal/portal`:
- the parity list is empty: every portal check passes against the new client;
- the theme's and the map's checks pass (slices 1 to 5), and the byte-identical check passes: a blueprint with no app
  and no pages generates exactly what it did on `goal/stage-1`;
- the new client declares its map in `blueprint/app/`, with no route matched by hand;
- an agent's `snapshot()` lists the portal's frame by name;
- nothing in `packages/portal-next`, `packages/shell` or `packages/theme` imports HeroUI, and they build with
  `HEROUI_AUTH_TOKEN` unset;
- every snag in `06-snags.md` is fixed, or parked with an owner and a reason.

Then the freeze and cutover (slice 12) land on GitHub, as the protocol's point 5 says, and the goal is done.

## Evidence for Aaron

- **Side by side:** a screenshot of every portal page at desktop width, the old client beside the new.
- **The parity curve:** the list's length over time, with each Goal 3 check that arrived by a merge marked.
- **The map, written and falling out:** the portal's `blueprint/app/` in full, beside what it generated (the routes,
  the navigation, the palette's index, the agent's map).
- **A browser video** of an agent finding a refusal code through ⌘K and opening the operation that throws it.

## Estimate

From Goal 3's pace (a medium slice three to six hours, checks first). Part 1: about 16 to 22 hours, the theme first,
the map language and the shell being new. Part 2: about 18 to 26 hours, six pages whose content and checks already exist. Cutover: 2 to
4 hours. All: about 36 to 52 hours, with slice 12 waiting on the cut-off.

## Where it stands
