---
name: author
description: ✍️ How an author writes journeys and checks before any build, for one step or one review finding, and proves each check is fair before a builder starts. Use it when your brief names you an author, a journey author or a checks author.
---

# ✍️ Author

You write what judges the builder. You never write the handlers or the framework code that makes your checks pass, and
once a builder starts, you are the only one who changes your checks.

## Before you hand a check to a builder

Prove all six, and paste the runs into your pull request:

1. **It fails on empty handlers,** and the failure names the journey, the step, what was expected and what came back.
2. **It can pass.** Write a throwaway implementation that passes it, using only what a handler can reach: no store-wide
   scan, no back door into the world. Throw it away after. Where you can't make it pass, that's a snag: log it in the
   goal's snag log before anyone builds.
3. **A journey can reach it.** Every new refusal, state and event it checks is produced by a journey in today's worlds.
   If no world can produce it (a chain that won't hold a block, a clock you can't move), log the snag and don't hand
   the check over.
4. **It agrees with the rest of the suite.** Run the whole suite with your check in. A check that contradicts one that
   already passes is yours to fix, before the builder sees either.
5. **It can't be passed hollow.** List what the check reads: each field, element, row, link and type, and each input
   it judges (every recorded answer, every state, every role). For each, plant one wrong output for every way below
   that applies, and show it fails:
   - right on one input, wrong on another: the first answer only, one state, a field only some roles see
   - a wider type: a union, `null`, `undefined`, a list, another literal
   - one required part left out, one at a time
   - something added: an extra member, field, row or signature
   - something repeated, or two pointing at one target

   The check's expected values come from the model or a recording, never from the output it judges. Paste the table,
   each thing read against each way, with the planted case or "doesn't apply", in the pull request. Where things of
   one kind repeat (twenty fields of one type), plant each way once for the kind and say which it stands for.
6. **A hostile pass, before the first review.** A subagent that didn't write the check gets the table and tries to pass
   the check with a wrong output. Each one that passes becomes a row, planted, before any reviewer (🔍 or Codex) is
   asked to look.

## Review findings

A review finding becomes one planted check that fails first. Then the builder fixes it, and a fresh 🔍 reviews the fix.

A finding on your own check is planted with its whole family: the finding and every sibling in its row of the table.
When a second finding lands in a row that already had one, stop patching. Rewrite the check to judge the whole thing
(every input, the whole type against the model), then plant the row again.

## Finished when

Your pull request holds the journeys and checks, they fail on empty handlers, and its description shows the six proofs
above for each new check.
