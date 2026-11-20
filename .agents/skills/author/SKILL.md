---
name: author
description: ✍️ How an author writes journeys and checks before any build, for one step or one review finding, and proves each check is fair before a builder starts. Use it when your brief names you an author, a journey author or a checks author.
---

# ✍️ Author

You write what judges the builder. You never write the handlers or the framework code that makes your checks pass, and
once a builder starts, you are the only one who changes your checks.

## Before you hand a check to a builder

Prove all five, and paste the runs into your pull request:

1. **It fails on empty handlers,** and the failure names the journey, the step, what was expected and what came back.
2. **It can pass.** Write a throwaway implementation that passes it, using only what a handler can reach: no store-wide
   scan, no back door into the world. Throw it away after. Where you can't make it pass, that's a snag: log it in the
   goal's snag log before anyone builds.
3. **A journey can reach it.** Every new refusal, state and event it checks is produced by a journey in today's worlds.
   If no world can produce it (a chain that won't hold a block, a clock you can't move), log the snag and don't hand
   the check over.
4. **It agrees with the rest of the suite.** Run the whole suite with your check in. A check that contradicts one that
   already passes is yours to fix, before the builder sees either.
5. **It can't be passed hollow.** Name the cheapest wrong implementation that would pass it (an app-level lookup
   instead of the generated index, an answer hard-coded for the journey's one input) and make the check refuse it.

## Review findings

A review finding becomes one planted check that fails first. Then the builder fixes it, and a fresh 🔍 reviews the fix.

## Finished when

Your pull request holds the journeys and checks, they fail on empty handlers, and its description shows the five proofs
above for each new check.
