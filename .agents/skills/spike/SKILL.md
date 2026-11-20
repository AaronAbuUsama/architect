---
name: spike
description: How a 🧪 spike thread runs one throwaway experiment for Orthograph, and how the conductor briefs one. Use it when starting a spike, or when your brief says you are a 🧪 spike thread.
---

# 🧪 Spike

A spike answers **one question** in throwaway code, fast, so the design can be decided on evidence rather than guesses.
Its code is never built into a package; its README is the product.

## The brief (the conductor writes it)

1. **The question,** in one sentence, and why it matters: which build-plan steps or decisions its answer feeds.
2. **What to build:** the smallest thing that answers it, and the exact versions to pin.
3. **What to prove:** numbered checks, each runnable, including at least one that tries to break the idea.
4. **Limits:** no cloud unless the question needs it, no keys, no spend; work under `spikes/<name>/` on `spike/<name>`.
5. **How to report:** the README below, and a pull request into `main`.

## The spike's own rules

- **Answer the question asked.** If you find a better question, say so in the README; don't chase it.
- **Try to break it.** A spike that only shows the happy path hasn't answered anything.
- **Measure what's cheap to measure:** timings, run-to-run sameness, counts.
- **Be honest about surprises.** The most useful line in a spike is usually the one that says "this didn't work, and
  here is why".
- **Stop when it's answered.** Half a day is normal; a spike that needs more is two spikes.

## The README

```markdown
# Spike: <name>

**Question.** <one sentence>
**Answer.** <yes / no / yes, if ...> in one or two sentences.

## What was tried
## What was found          numbered, each with the evidence (output, timings, a failing case)
## Measurements
## The decision it supports
## Open risks
```

## When it's done

Merge the pull request into `main` (it adds only `spikes/<name>/`), end with a `TO THE CONDUCTOR` block holding the
answer, the decision it supports and the steps it changes, and the conductor folds it into the build plan. A spike never
mints a decision ID: if its finding needs a new decision, ask the conductor (or the goal's lead) for the ID, as the
`threads` skill says.

Three spikes are already done, in `design/spikes/`: names from paths, the world clock, and a thing as a Durable Object.
Their write-ups are the model to follow.
