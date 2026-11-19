# Goal 3: stage 1 of Plugged In, proved cell by cell on the grid

Aaron chose this on 19 November 2026 (option D of four, after the grid in K14 and K17):

> "Yes, agreed with your option D. Set up an integration branch for this, all of your work goes in there, that way you
> don't have any issues of permissions with merging and stuff. You're totally in control of this. You have to make sure
> that you're setting up evidence, you're proving it end to end, and you're going to present it to me in a way that's
> very easy to see. A recording of the final run would be great, screenshots too."

And, the same day: "This should also include a staging deployment."

## The prompt

> You lead Goal 3 in this repository. Run it as one autonomous goal until its done check passes on `goal/stage-1`, or
> until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`; this file, word for word; `design/decisions/K14-the-grid.md` and `design/grid/grid.json`;
> `design/milestones.md` (the v1.0 stages, M1, M2 and stage 1); K9, K13, K15, K16, K17 and K18 in `design/decisions/`;
> `design/portal.md`; `design/handoff.md`; and the `conductor`, `reviewer`, `threads` and `kanban` skills in
> `.agents/skills/`.
>
> - **Branch:** `goal/stage-1`, cut from `m1` once every m1 pull request has landed. Each slice reaches it through a
>   pull request into `goal/stage-1`, which you merge when CI is green and a 🔍 reviewer that wrote none of it passed it.
>   Merge `main` in whenever `main` moves.
> - **The loop:** take the top card that isn't green, in lane order. A checks author makes its eval and watches it
>   fail; a builder makes it pass; CI records the verdict; the card turns green. Repeat.
> - **Separate agents:** checks authors write the grid runner, every card's eval and the story journey. Builders never
>   edit them. At most three builders at once.
> - **Ownership:** you own the architecture. Where code, design and grid disagree, decide, fix the other in the same
>   change, and record it in `design/decisions/`.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each card on the
>   board (the `kanban` skill), so a fresh or compacted session continues where you stopped.
>
> Report to the conductor session that started you after each lane turns green, in one or two lines.

## The bound

Stage 1 of v1.0 (`milestones.md`, "v1.0: four stages"): a person claims `@name` and gets a public page of links. On the
grid that is **11 building blocks by 9 outputs, 99 cards**, plus **the story card**:

- **Rows:** operation, error, thing, step, machine, event, visibility, journey, roles, environment, store.
- **Columns:** model, API, server, SDK, CLI, MCP, docs, portal, telemetry.
- **Left for stage 2:** the mount and device rows (plugins and operations on the device), except where a stage 1 card
  needs them.
- **The work** that turns cards green is the rest of M1, all of M2 and ST1.01 to ST1.08 (ST1.05 moved to M3 by K13).
  Each slice is ticked in `milestones.md` with its proof when it lands. The gates of M1 and M2 still have to pass, on
  this branch, before it reaches `main`.
- **Local, never fake,** as in goals 1 and 2: real workerd, D1, Durable Objects, Better Auth and Collector on this Mac;
  no Docker.
- **One cloud piece: staging.** Plugged In is deployed to a real staging environment on Cloudflare, proved there and
  destroyed. This brings M7.01, M7.03 and M7.04 forward for staging alone. See "Staging" below.

**Aaron's override, recorded.** "Nothing in a milestone starts until the previous milestone's gate passes on `main`"
(`AGENTS.md`) is replaced, for M1, M2 and stage 1 only, by one integration branch under the conductor's control. The
gates still order the landing, not the work.

## The done check

```bash
nx run e2e:grid --stage=1
```

It exits 0 only when each of the 99 cards is green or agreed not needed, and the story card passes.

- **Green** means the card's evidence ran in CI on `goal/stage-1` and its verdict is in the logbook. A card that passes
  only locally is not green.
- **Agreed not needed** means the conductor wrote the reason into the card in `grid.json`. The default is needed.
- **The story card** starts from a fresh folder and uses the real `ortho` from the local registry: `ortho new
  plugged-in`, then a person signs up, claims `@aaron`, adds three links and sees their public page. It runs through the
  CLI, the SDK, MCP and HTTP, in the `local`, `test` and `staging` environments, and every call shows in the portal.
- **The staging card** passes only when a CI run deployed Plugged In to staging on Cloudflare, ran the story against
  it, and then `ortho env destroy staging` left nothing behind in the account.

## The first three steps

1. **Grade the grid again** against the head of `goal/stage-1`, since it was last graded at `m1@6419d4b7`. Add K17's
   target prefix to every card id (Q1), so the ids read like `effect.operation.model`.
2. **The grid runner.** A checks author writes `nx run e2e:grid`. It reads `grid.json`, runs each card's evidence,
   writes the verdict to the logbook, and turns any card with no runnable evidence red. Every card the regrade found
   unproved fails.
3. **The Proof page.** The portal gains a Proof page (with M1.13) that shows the grid from the logbook's verdicts, the
   same ones the runner wrote, each card linking to its evidence. From then on, what Aaron sees is what was proved.

Then the lanes, in the grid's order. Lanes may run side by side while no two builders touch the same files.

## Staging

- **The account and token** are the ones Aaron set on the repository on 19 November 2026: the `CLOUDFLARE_ACCOUNT_ID`
  variable and the `CLOUDFLARE_API_TOKEN` secret. They are used only inside GitHub Actions. Never read, print, copy or
  write either value, and never create another credential. If staging needs anything more, such as a telemetry token
  (M7.08) or a domain, stop and ask Aaron.
- **M7.01 first:** `decisions/M7-cloud.md` records the account, the token's scope, which secret store
  `Cloudflare.secrets` means, Aaron's yes (his words above), and a cost estimate under $10 a day across everything.
- **M7.03 and M7.04:** `ortho env up staging` deploys from the model through the infra projection, and
  `ortho env destroy staging` removes everything it made. A CI workflow, run by hand, does up, the story, the evidence
  and destroy as one job, and destroy always runs, even when the story fails.
- **Nothing left running:** after each run, the job lists the account's Workers, D1 databases, Durable Object
  namespaces and R2 buckets, and fails if any of Plugged In's remain. Touch only resources this goal made. The old
  `codex/links-staging` branch has no teardown, so don't run it.

## Evidence for Aaron

- **Every card:** its evidence run is captured with `tools/evidence/capture.sh` under
  `design/evidence/grid/<card-id>/`, never retyped.
- **The final run,** from a clean checkout:
  - a terminal recording of `nx run e2e:grid --stage=1`;
  - the staging job's log, with its deploy, its story run and its destroy, and the account empty afterwards;
  - a browser video of the story card, recorded by Playwright, from sign-up to the public page, with each call opening
    in the portal;
  - a screenshot, at desktop width, of every portal page the story touches, and of the Proof page all green.
- **One page for Aaron.** The conductor publishes it as an artifact: the grid, green, each card opening its proof, with
  the recordings and screenshots on it. Each lane's progress is added to it as it turns green.

## Landing

When the done check passes, open one pull request from `goal/stage-1` to `main`. It merges when Gates M1 and M2 pass on
it, `nx run e2e:grid --stage=1` passes in CI, and a 🔍 reviewer passed the whole branch. Then tag
`plugged-in/stage-1`.

## Stop everything you start

No Verdaccio, workerd, Collector or port is left running after a run. Each subagent stops its own processes before it
reports.
