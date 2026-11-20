# ST1-24-timing: the warm-world speed row is a ratio to the cold run, not 6 seconds

20 November 2026. Decided by the conductor under AGENTS.md, "Who decides", on the evidence of the ST1.24 build (#214).

## Evidence

CI run 44777690829 on f26b6cfb: reuse worked and the structural rows passed, but the timed warm runs were 6.18 s and 6.58 s
against a 13.4 s cold run on the same runner. On the builder's quiet Mac the warm run took about 4.7 s against 9.7 s cold. Warm is
about 46 to 48% of cold on both. About 4 s of a warm run is the journeys' own password hashing, which a warm world cannot save. An
absolute 6 s therefore measures the machine, not what was built.

## Decision

Check 30's speed row asserts that the faster of two timed warm runs, after a warm-up, is at most 60% of the cold run of the same
project measured on the same machine in the same file. It prints both times and whether the warm run was under 6 s, as
information only. The 6 s stays the target on a developer's machine, in words (the ST1.24 row in `milestones.md`).

## Fairness

The rule is a function (`fastEnough`) with its own control: green at CI's numbers (6.18 and 6.58 against 13.4) and the quiet Mac's
(4.7 against 9.7), red for a second run that is cold (13.0 against 13.4, about 100%), red just over 60%, red when slower than cold.
The row itself is red today because prove does not reuse `ortho dev`'s world (it stops at "nothing is warm"), and it needs the warm
build to be green.

## Supersedes

- design/milestones.md (ST1.24): "finishes in under 6 s with the same verdict as a cold run" → "finishes in at most 60% of the time of a cold run on the same machine (about 6 s on a developer's machine) with the same verdict as a cold run"
