# K34: goals start by what they need, not by milestone order

21 November 2026. Decided by the conductor under AGENTS.md, "Who decides", to carry out Aaron's ask that day: "we need
a map of all of the goals … we want to make them as independent as possible … so we can parallelize these". The map is
[`../goals/map.md`](../goals/map.md).

## The problem

`AGENTS.md` said nothing in a milestone starts until the previous milestone's gate passes on `main`. Read strictly,
the milestones run one at a time: workflows (M3) wait for the beta, agents (M4) wait for M3's gate, events (M5) for
M4's. That ordering was already broken twice, on purpose: K26 pulled on chain (M6) ahead of M3 to M5, and Goal 7 ran a
stage 3 spike while stage 1 was still open. Nothing in M3's workflow engine, M8's clock or stage 4's Aztec work reads
what M2 builds, so the order costs parallel work and buys nothing.

## The call

1. **A goal builds a slice once what that slice needs has landed,** whatever milestone it sits in. A slice's `needs`
   column in `milestones.md` is the rule; the milestone order is not.
2. **A milestone still counts as done only when its gate passes on `main`.** Releases (K28) are unchanged: the preview
   is Gate M1 and the npm preview, the beta is Gate M2 and Goal 3's done check, 1.0 is the four stage gates.
3. **Goals are drawn for independence** (`design/goals/map.md`): each owns its paths, adds new modules rather than
   editing the core, has one owner per shared seam, and writes its journeys and checks before what its builds need has
   landed.
4. **The map is the list of goals.** Goals 8 to 16 are planned there; each starts when the conductor has written its
   brief and cut and protected its branch.

## Supersedes

- `AGENTS.md`: "until the previous milestone's gate passes on `main`." → "until what it needs has landed, in any milestone order (K34); a milestone is done when its gate passes on `main`."
