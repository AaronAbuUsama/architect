# Goal 3: stage 1 of Plugged In, hill-climbed through its journeys

## Aaron's words, 19 November 2026

He first chose option D (the grid for stage 1, shown in the portal):

> "Set up an integration branch for this, all of your work goes in there, that way you don't have any issues of
> permissions with merging and stuff. You're totally in control of this. You have to make sure that you're setting up
> evidence, you're proving it end to end, and you're going to present it to me in a way that's very easy to see. A
> recording of the final run would be great, screenshots too."

"This should also include a staging deployment." Then he changed the shape:

> "The way people are going to use this in real life is to hill climb the journeys, right? That is the whole point of
> setting up the journeys in the first place, such that it's easy for a coding agent to just hill climb that journey.
> So really what we need to do is we need to set up the basis, make sure that it's hill climbable, and then hill
> climbing. While we're hill climbing it, based upon all of the issues and the things that we're fixing and the
> processes, we're making suggestions for the skills and the working processes."

The conductor steelmanned and strawmanned it, and he agreed to this version: **the journeys are the climb, and the grid
is the guardrail.** Staging runs on `workers.dev` for now, with no domain.

## What this goal proves

Orthograph is used this way: someone writes a blueprint and its journeys, and a coding agent climbs them until they are
green. This goal does exactly that with Plugged In at stage 1, where a person claims `@name` and gets a public page of
links. It proves four things:

1. **The climb works.** An agent that sees only what a user sees gets every stage 1 journey green.
2. **It's climbable.** Every failure tells the agent which step failed, what was expected, what came back, and which
   file to change, fast and the same every time.
3. **Everything falls out.** Every grid cell the journeys touch is green in all nine outputs, not only through the SDK.
4. **It runs for real.** The story runs in `local`, `test` and `staging` on Cloudflare, and staging is destroyed after.

What the climb teaches is the second output: every snag becomes a fix to the framework, the docs, the scaffold, the
skills or the process.

## The prompt

> You lead Goal 3 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/stage-1`, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`; this file, word for word; `design/milestones.md` (the v1.0 stages, M1, M2 and stage 1);
> `design/decisions/K14-the-grid.md` and `design/grid/grid.json`; K9, K13, K15, K16, K17 and K18 in
> `design/decisions/`; `design/portal.md`; `design/handoff.md`; and the `conductor`, `reviewer`, `threads` and `kanban`
> skills in `.agents/skills/`.
>
> - **Branch:** `goal/stage-1`, cut from `m1` once every m1 pull request has landed. Every change reaches it through a
>   pull request into `goal/stage-1`, which you merge when CI is green and a 🔍 reviewer that wrote none of it passed
>   it. Merge `main` in whenever `main` moves. **Started early (Aaron, 19 November 2026: "Start them now"):** the
>   branch was cut at `32388caf` (m1 at `5e66bc91` with main at `a002dab4` merged in) before three m1 pull requests
>   landed: #76 (K16, the scaffold explains itself), #95 (M1.35, visibility) and #104 (the Codex fixes). Each time one
>   lands on `m1`, `origin/m1` is merged into `goal/stage-1` through a pull request (CI green, and a 🔍 that wrote none
>   of it); #104 landed first, at `c63da4b5`. Until #76 lands, Goal 3 stays off the files it changes (the list on the
>   pull request: `packages/cli/src/main.ts` and `packages/cli/src/modules/{add,check,model}`, `e2e/m1/` checks 00, 19
>   and 22 with `loop.ts`, the canon docs, and the generated output it refreshes) and the code its builds work in:
>   `packages/language-effect/src/modules/handler/**`, `packages/generators/` and `packages/compiler/`. Plugged In's
>   `generated/` is regenerated after each m1 merge rather than hand-merged.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same journey.
> - **Ownership:** you own the architecture. Where code, design, journeys and grid disagree, decide, fix the other in
>   the same change, and record it in `design/decisions/`.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each card on the board
>   (the `kanban` skill), so a fresh or compacted session continues where you stopped.
>
> Each time a journey turns green, report to the conductor session that started you, in two or three lines: the
> journey, how many tries it took, its snags and what they changed.

## The bound

- **Stage 1 only:** the journeys below, the framework work they need (the rest of M1, all of M2, and ST1.01 to ST1.04
  and ST1.06 to ST1.24, ST1.05 having moved to M3 by K13), and the grid cells they touch. The invariants (ST1.09 to
  ST1.22) and the speed slices (ST1.23, ST1.24) are inside because check 28 sits on this goal's ratchet list, the stage 1
  gate (M2.12) names ST1.06 to ST1.22, and the speed slices serve "climbable"
  ([`decisions/G10-goal-3-bound.md`](../decisions/G10-goal-3-bound.md)). Each milestone slice is still ticked in
  `milestones.md` with its proof when it lands, and Gates M1 and M2 must pass on this branch before it reaches `main`.
- **Local, never fake,** as in goals 1 and 2: real workerd, D1, Durable Objects, Better Auth and Collector on this Mac.
  No Docker.
- **One cloud piece: staging,** on `workers.dev`. See "Staging".
- **At most three builders at once,** and every agent stops the processes it starts before it reports.

**Aaron's override, recorded.** "Nothing in a milestone starts until the previous milestone's gate passes on `main`"
(`AGENTS.md`) is replaced, for M1, M2 and stage 1 only, by one integration branch under the conductor's control. The
gates still order the landing, not the work.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Journey author** | Plugged In's stage 1 journeys and starting worlds, and the declarations in `examples/plugged-in/blueprint/` they need: the spec, as a user would write it | handlers, the framework |
| **Checks author** | the climbability check, the grid runner, and every grid cell's eval | handlers, the framework, the journeys |
| **Climber** | only `examples/plugged-in/src/`, using only what a user has: the scaffold, `ortho` and its output, the generated docs, and the skills a user would get | the blueprint, the journeys, `packages/`, any check |
| **Framework builder** | `packages/`, to clear a snag or turn a grid cell green, check first | the journeys, any check, Plugged In's handlers |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

The climber is the user. When it is stuck on something it can't fix inside `src/`, such as a confusing error, a
missing output, a wrong scaffold or a framework bug, it writes a snag and moves on to another step. It never works
around the framework from inside the handlers.

## The journeys

ST1.02's list, plus the story. Each is written before its climb starts and fails on empty handlers.

- **Claim:** claim a free handle; a taken one is refused with `HandleTaken`; the same request sent twice claims once;
  release; resolve a handle to its page.
- **Links:** add, order and remove a link; a stranger can't edit someone else's page.
- **The page:** anyone, signed in or not, reads a public page.
- **The story:** from a fresh folder with the real `ortho` from the local registry, `ortho new plugged-in`. A person
  signs up, claims `@aaron`, adds three links and sees their public page, through the CLI, the SDK, MCP and HTTP.

Sign-in waits on M2. Until it lands, a signed-in cast member is one of the world's fixed test people
(`Identity.testPrincipals`), so every journey but the story's sign-up can be climbed now
([`decisions/ST1-02-plugged-in-ownership.md`](../decisions/ST1-02-plugged-in-ownership.md)).

## The loop

1. **Floor.** The journey author writes the journeys, and all of them fail. The checks author writes the climbability
   check and the grid runner. The starting curve is recorded: 0 of N steps green.
2. **Climb.** The climber takes the first red step, reads `ortho prove`, changes `src/`, and runs again, until the step
   is green or it files a snag. Every prove run is appended to `design/evidence/climb/runs.jsonl`, taken from prove's
   own output and never retyped: time, journey, steps green and total, and seconds taken.
3. **Snags.** A framework builder takes each snag in `design/goals/03-snags.md`, check first, and the climber comes
   back to that step once it's fixed.
4. **Guardrail.** When every step of a journey is green, the grid runner checks the cells of every building block the
   journey used, in all nine outputs. A red cell means the journey isn't done: a framework builder turns the cell
   green. From then on CI runs that cell on every push, and a push that turns it red fails.
5. **Lessons.** When a journey is done, its snags become pull requests to the skills, the docs, the scaffold or the
   process, and the lead reports them.

### What "climbable" means, as a check

With an empty or wrong handler planted, `ortho prove` must:

- name the journey and the step that failed;
- show what was expected and what came back;
- point to the handler file and the declaration it answers to;
- finish one journey in under 30 seconds once the world is warm;
- give the same result on two runs in a row.

The checks author writes this as `nx run e2e:climb`, with one planted fixture for each kind of failure: a wrong
answer, a missing refusal, a missing event, the wrong state, and a missing span.

### What the guardrail checks

Take the step where a taken handle is refused. The journey proves `HandleTaken` reaches the SDK. The grid's error row
then checks the same refusal everywhere else:

- the CLI prints `[code] HandleTaken { … }` and exits 10;
- the MCP result carries its code, with its fields cut to what the agent may see;
- the docs list it in the claim page's refusals table;
- the portal shows it under the claim arrow, counted by code;
- the span carries `refusal.code`.

The same goes for the operation, thing, machine, event and other rows each journey uses. The grid only grows as fast
as the climb: a cell is switched on by the first journey that touches it.

### A snag entry

```md
## S-07 · claim · "a taken name is refused"
- Hit: prove said "expected HandleTaken, got Defect" with no file named.
- Lost: 4 tries, 6 minutes.
- Cause: the scaffold's Match didn't list HandleTaken, so the handler threw.
- Fix: framework, M1.44's scaffold lists every declared refusal (PR #…). Skill: none.
- Status: fixed
```

## Staging

- **Where:** Cloudflare's `workers.dev` addresses, with no custom domain for now.
- **The account and token** are the ones Aaron set on the repository on 19 November 2026: the `CLOUDFLARE_ACCOUNT_ID`
  variable and the `CLOUDFLARE_API_TOKEN` secret. They are used only inside GitHub Actions. Never read, print, copy or
  write either value, and never create another credential. If staging needs anything more, stop and ask Aaron.
- **M7.01 first:** `decisions/M7-cloud.md` records the account, the token's scope, which secret store
  `Cloudflare.secrets` means, Aaron's yes (his words above), and a cost estimate under $10 a day across everything.
- **M7.03 and M7.04:** `ortho env up staging` deploys from the model through the infra projection, and
  `ortho env destroy staging` removes everything it made. One CI workflow, run by hand, does up, the story, the
  evidence and destroy as a single job, and destroy always runs, even when the story fails.
- **Nothing left running:** after each run the job lists the account's Workers, D1 databases, Durable Object namespaces
  and R2 buckets, and fails if any of Plugged In's remain. Touch only what this goal made. The old
  `codex/links-staging` branch has no teardown, so don't run it.

## The done check

```bash
nx run e2e:stage1
```

It passes only when all of these hold, in CI on `goal/stage-1`:

- every stage 1 journey is green in `local` and `test`;
- `nx run e2e:climb` passes;
- every grid cell a journey switched on is green, with its verdict in the logbook;
- the latest staging run deployed, ran the story, destroyed everything, and left the account clean;
- every snag in `03-snags.md` is fixed, or parked with an owner and a reason.

## Evidence for Aaron

- **The climb curve:** steps green over time, from `runs.jsonl`, with each snag marked where it was hit and where it was
  fixed.
- **The snag log,** each entry linked to the change that fixed it, and the skill and process changes it led to.
- **The grid,** showing only the cells the journeys switched on, each opening its evidence. The portal's Proof page shows
  the same verdicts from the logbook.
- **The final run,** from a clean checkout:
  - a terminal recording of `nx run e2e:stage1`;
  - a browser video, recorded by Playwright, of the story from sign-up to the public page, with each call opening in
    the portal;
  - a screenshot, at desktop width, of every portal page the story touches;
  - the staging job's log: deploy, the story, destroy, and the listing showing nothing with the run's prefix afterwards.
- **One page.** The conductor publishes it as an artifact and adds each journey to it as it turns green.

## Landing

When the done check passes, open one pull request from `goal/stage-1` to `main`. It merges when Gates M1 and M2 pass on
it, `nx run e2e:stage1` passes in CI, and a 🔍 reviewer passed the whole branch. Then tag `plugged-in/stage-1`.
