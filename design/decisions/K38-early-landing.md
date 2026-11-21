# K38: a slice another goal needs lands early

**Decided 21 November 2026 by the conductor**, under AGENTS.md, "Who decides", answering Ask #440 (Goal 3's lead,
passing on a Codex finding on #430). It builds on K34 (a slice starts once what it needs has landed).

## The problem, in code

Every goal brief lands its work whole, after its done check (`design/goals/15-release.md:78-79`):

```text
**Done check:** `nx run e2e:m7` passes on `goal/release` (Gate M7, M7.12) … It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.
```

K34 counts a slice as landed once it is ✅ on `goal/stage-1`. So two goals that each need a slice of the other wait
for ever, though no slice waits on itself:

- Goal 15's gate (M7.12) needs Goal 16's M7.11 (`15-release.md:70`); Goal 16's M7.11 needs Goal 15's M7.05
  (`16-capxul.md:53`).
- Goal 9's M8.17 needs Goal 4's M6.09 (`09-time.md:84`); Goal 4's M6.21 needs Goal 9's M8.09.

## The call

**A slice that another goal needs lands early, on its own.** Once its check is green on the goal's branch, the goal
opens one pull request from its branch into `goal/stage-1` (into `main` once Goal 3 has landed) carrying only that
slice and what it rests on, after merging `goal/stage-1` in. It merges when CI is green, every thread is resolved and
a 🔍 reviewer passed it, the way Goal 6's theme landing already does (`06-portal.md`, "The theme landing"). Its row is
then ✅ there, so the needing goal merges `goal/stage-1` in and builds. The whole goal still lands by one pull request
after its done check.

The needing goal says which slice it waits on by an Ask issue in the owning goal's milestone (K32, K33), so the owner
knows to land it early. So M7.05 lands early from Goal 15, M7.11 then from Goal 16, and Goal 15's gate passes;
M8.09 lands early from Goal 9, M6.09 from Goal 4.

Not chosen: merging goal branches into each other, which K32 forbids (a goal never pushes to another's branch); and
moving the slices between goals, which only shifts the cycle.

## What changes

- `AGENTS.md`, "Goals", gains the rule.
- Briefs 8 to 16 gain it in "How it runs", "Its needs". Goal 4's brief lives on `goal/on-chain`; AGENTS.md wins over
  it, and an Ask issue in Goal 4's milestone tells its lead.

Nothing is superseded: the rule is added, and no older words change.
