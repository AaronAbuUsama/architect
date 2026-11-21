# Goal 6: the new portal, on our own components and the app's map

Branch `goal/portal`, cut from `goal/stage-1`. Written 21 November 2026 with KXX.

## Aaron's words, 21 November 2026

After the app map grill ("I agree with all of your defaults"), to the 📐 designer thread: kick off a new goal "against
the new portal", so the old portal is deprecated and "this is the new portal built from our own components", and "I
want this to be able to run in parallel to the other work that's actually running."

## What this goal proves

1. **The map falls out.** An app declares its map in the blueprint (KXX), and the router, the shell, the palette, the
   breadcrumbs, the agent's map and the docs come from it.
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
> Read first:
> - `AGENTS.md`, and this file word for word;
> - `design/decisions/KXX-app-map.md` (the map), `K29-ui-layer.md` (the pieces, UI SDK) and `K19-portal-prebuilt.md` (the portal's
>   server and client line), and `design/ui/heroui-inventory.md` (every part of the old client, with what replaces it);
> - `design/portal.md` (the agreed information architecture: keep it; this goal changes how the portal is built, not
>   what it shows) and the `portal-design` skill (the process and the style guide);
> - `e2e/m1/21-portal-viewer.test.ts`, `28-st1-22-rules-in-the-portal.test.ts`, `e2e/served-portal/` and the grid's
>   portal evals: the checks that hold the old client;
> - the `ui-sdk`, `conductor`, `reviewer`, `author`, `threads`, `kanban` and `portal-design` skills.
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
>   the board (the `kanban` skill).
> - **Reporting:** each time a slice merges, report to the conductor session, in two or three lines: the slice, its
>   check, the parity list's length. Write for Aaron's ear.
> - **Branch protection:** ask the conductor to protect `goal/portal` like `goal/stage-1` before the first pull request.

## The bound

- **Inside:** the map language (KXX) in `orthograph` and the compiler, the app projection (`generated/app/`), the shell
  (`packages/shell`, `@orthograph/shell`), the theme (`packages/theme`, `@orthograph/theme`), the new client
  (`packages/portal-next`), its checks, and cutover.
- **Outside, never edited before cutover:** `packages/portal` (the old client, the wire and the server half),
  `packages/portal-ui`, `@orthograph/web` and the web projection (Goal 5's), Plugged In, and every Goal 3 journey and
  check. After cutover, only cutover's own pull request touches `packages/portal`.
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
   the API lacks is an additive request to Goal 3 through the conductor, never an edit here.
5. **The cut-off.** When the parity list is empty and the done check passes, the lead tells the conductor; Goal 3 stops
   adding features to the old client from then; cutover's pull request lands; from then on all portal work goes to
   the new client.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Checks author** | each slice's failing check, first, on a `-check` branch; the two-client runner and the parity list's first lines | the framework, the new client's code, the journeys |
| **Framework builder** | the map language, the compiler checks, the app projection, `@orthograph/shell`, `@orthograph/theme`, on `-build` branches | any check, the new client's pages |
| **Portal builder** | `packages/portal-next` only, the way an app's author would: its `blueprint/app/`, its pages, its components | `packages/` outside it, any check |
| **Designer** | a screen the old client lacks, drawn first and shown to Aaron (`portal-design`) | code |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

When the portal builder is stuck on something it can't fix inside `packages/portal-next`, it writes a snag in
`design/goals/06-snags.md` (created in slice 1, the shape of `03-snags.md`) and moves on. It never works around the map
or the shell from inside the client.

## The slices

Each slice starts with its check, written first and failing, and ends with it green on `goal/portal`.

### Part 1: the map, beside everyone (none of it touches Goal 3's or Goal 5's files)

| # | Slice | Done when |
|---|---|---|
| 1 | **The checks.** The two-client runner, `nx run e2e:portal-next`, the parity list (every portal check, all red), and the map's own checks: the compiler's four refusals (KXX), a derived default map for a fixture with no `app.ts`, typed links, a palette that lists only what the caller may open and call | they fail with the map empty; the old client's checks still pass |
| 2 | **The map language.** `Blueprint.app`, `Blueprint.page`, `Blueprint.layout`, `Blueprint.nav` in `orthograph`; `model.app` in the compiler, hashed; the four compile errors; the derived default | slice 1's language and compiler checks |
| 3 | **The app projection.** `generated/app/`: the route table, a typed link per page, the navigation, the palette's index and the agent's map, as data | slice 1's projection checks; acme's and Plugged In's other generated files unchanged |
| 4 | **The theme and the shell.** `@orthograph/theme`; `@orthograph/shell`: the router over the route table, the layouts (`sidebar`, `topNav`, `none`) and their slots, the navigation, the breadcrumb and the ⌘K palette, on UI SDK (`navigation-menu`, `collapsible`, `scroll-area`, `command`, `menu`) | slice 1's shell checks in Chromium; an agent's `snapshot()` on a fixture shell lists its navigation and palette by name |

**First landing, after slice 4:** one pull request from `goal/portal` into `goal/stage-1`, so Goal 5's Plugged In
screens can declare their pages. Merge `goal/stage-1` in first. It merges when CI is green and a 🔍 reviewer passed it.

### Part 2: the new client

| # | Slice | Done when |
|---|---|---|
| 5 | **The frame.** `packages/portal-next`: its `blueprint/app/` declaring `portal.md`'s map (home, things, operations and their five tabs, environments, compare, journeys, starting worlds, reference, plugins, monitor, traces), the top bar (environment picker, ⌘K), the rail and its panels, the tree, the live rail, each keeping its `data-portal` hook | check 21's frame clauses leave the parity list |
| 6 | **Home, things and operations** (the contract, metrics, proof, docs and notes tabs) | their lines leave the list |
| 7 | **Environments, compare, journeys, starting worlds** | their lines leave the list |
| 8 | **Reference, plugins and the rules** (check 28) | their lines leave the list |
| 9 | **Monitor and traces** (a trace on UI SDK's `Waterfall`, or ours if it is still experimental) | their lines leave the list; the screenshots are byte-identical across two runs |
| 10 | **The agent's portal.** The agent's map tool on the portal; every control by name | an agent's `snapshot()` lists the search, the tree, the tabs and the environment picker by name |

### Part 3: cutover

| # | Slice | Done when |
|---|---|---|
| 11 | **Cutover**, after the cut-off. Check 15 rewritten first by a checks author (ST1.28); then one pull request into `goal/stage-1` that serves `portal-next` at `/portal`, deletes the old client, `@orthograph/portal-ui`'s HeroUI and the licence machinery (`pro.mjs`, `sheets.mjs`, the CI step), and folds `e2e:portal-next` into the normal portal checks | every portal check passes on the one client; check 15 passes; the portal builds with `HEROUI_AUTH_TOKEN` unset |

## Decision IDs

The lead keeps this list; ask the lead for the next one before writing a decision on this branch.

| ID | File | Taken by |
|---|---|---|

## The done check

```bash
nx run e2e:portal-next
```

It passes only when all of these hold, in CI on `goal/portal`:
- the parity list is empty: every portal check passes against the new client;
- the map's checks pass (slices 1 to 4), and acme's and Plugged In's existing generated files are unchanged;
- the new client declares its map in `blueprint/app/`, with no route matched by hand;
- an agent's `snapshot()` lists the portal's frame by name;
- nothing in `packages/portal-next`, `packages/shell` or `packages/theme` imports HeroUI, and they build with
  `HEROUI_AUTH_TOKEN` unset;
- every snag in `06-snags.md` is fixed, or parked with an owner and a reason.

Then cutover (slice 11) lands, and the goal is done.

## Evidence for Aaron

- **Side by side:** a screenshot of every portal page at desktop width, the old client beside the new.
- **The parity curve:** the list's length over time, with each Goal 3 check that arrived by a merge marked.
- **The map, written and falling out:** the portal's `blueprint/app/` in full, beside what it generated (the routes,
  the navigation, the palette's index, the agent's map).
- **A browser video** of an agent finding a refusal code through ⌘K and opening the operation that throws it.

## Estimate

From Goal 3's pace (a medium slice three to six hours, checks first). Part 1: about 14 to 20 hours, the map language
and the shell being new. Part 2: about 18 to 26 hours, six pages whose content and checks already exist. Cutover: 2 to
4 hours. All: about 34 to 50 hours, with slice 11 waiting on the cut-off.
