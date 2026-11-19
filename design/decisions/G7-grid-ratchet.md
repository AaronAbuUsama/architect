# G7: red grid cells are listed, may not grow, and must leave the list when fixed

Decided 19 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`. Built by the checks author.

## The problem

Goal 3 switches a grid cell on when a journey first touches it, and CI fails on a red cell (K14, `e2e/grid/README.md`). Plugged In's seven
journeys switched on 53 cells, 316 (cell, subject) pairs. 239 are green and **77 are red** today: the framework has not caught up to what
K14 asks of the CLI, SDK, MCP, docs, portal and some spans. Ten more touched cells are held off (`held-off.json`). The red pairs are
real framework work, owned by M1.13, M1.36, M1.37, M1.42 and M2.08, and none of it is the climb's. A red `e2e-grid` blocks every pull
request into `goal/stage-1` until all of it lands.

## The options

- **A. Block on red.** What the runner did. Honest, but no pull request merges until M1.13 and M1.42 are done, so the climb stops.
- **B. Switch the red cells off.** The push goes green, and the grid lies: a cell that fails today looks like one nobody has looked at, and
  nothing stops a green cell turning red unseen. Rejected; "never weaken an eval to make it green".
- **C. Ratchet** (the call). The red pairs are listed, each with its reason and what it waits on. The list may not grow, and a pair that
  turns green must leave it in the same change. The same rule as `e2e/ratchet` for the m1 checks.

## The call: C

`e2e/grid/expected-red.json` is `{ pairs: [{ cell, subject, reason, waitsOn }] }`, with `waitsOn` K14's "fix" column for the cell
(a slice) and the package file the checks author found. `nx run e2e:grid` runs `ortho prove`, judges every switched-on pair and fails on:

1. a red pair that is not on the list (a new failure);
2. a listed pair that is not switched on, or that no cell judges (the list cannot hold what nothing proves);
3. a listed pair that is green (it is fixed, so it comes off the list in the same change).

It prints each, then `ratchet ✔ 77 expected red, 0 unexpected, 0 newly green, 0 not switched on`. `Grid.ratchet` is a pure function of the
report and the list, in `e2e/grid/src/modules/grid`; it keys by pair, not by test file, so `e2e/ratchet`'s code is not reused (its
unit is a vitest test, ours a verdict). Three tests keep the list honest: every listed pair is switched on, each names a slice or a
package file, and the list parses.

**Two scope calls (Goal 3 lead, 19 November 2026).**
1. M2.08 (`prove --through`) is inside Goal 3's bound ("all of M2"), after M2.05. Its 7 pairs (`operation.cli`'s journeys half) stay on the
   list and the done check waits for them. `error.cli` and `error.mcp` switch on when M2.08 lands.
2. M1.37's MCP output schema and states (`thing.mcp`, `machine.mcp`, 5 pairs) are pulled into Goal 3 from M3, because a journey touched
   those cells. They are built with M1.42's client slice, and the list labels them "M1.42 (with M1.37's output schema, pulled from M3 by G7)".

K19 (the portal prebuilt, #103) is the route for the M1.13 portal pairs.

**When the list may grow.** Only in a checks author's change; only for pairs that change's new reading turns red; each named in the PR body with
its reason in the entry. Builders never add to it. K19's served portal (#149) is the first case: the portal's pages are read in a browser, so 13
`thing.portal` and `step.portal` pairs that were green on server-rendered HTML are listed until the portal is split.

**The goal's done check needs the list empty.** A pair stays visible until a builder fixes it; fixing it is what shortens the list.

CI: the `e2e-grid` job now runs `run --prove` through the nx target (`e2e/project.json`), with the No-Docker step and the Collector cache of
`e2e-climb`. No Foundry: Plugged In has no chain. A local run is 47 seconds, so `timeout-minutes` is 10.

## The evidence

239 of 316 pairs green, 77 red, 53 cells on, 10 held off, from one `nx run e2e:grid --skip-nx-cache` on the branch (exit 0, ratchet ✔). The 77
by slice (a pair that names two counts under each): M1.42 52 (the 5 MCP pairs now counted here, M1.37's output schema pulled from M3), M1.13 38, M2.08 7, M1.36 3 (operation.cli's journeys half).
By file, the builders' list is in `e2e/grid/README.md`, "Where Plugged In stands".

Not decided here: `error.cli`, `error.mcp` (`prove --through`, S-11, S-20) and the eight not-needed event and journey cells (K14 Q2, Q3)
stay in `held-off.json`, not on this list, because they are not switched on.
