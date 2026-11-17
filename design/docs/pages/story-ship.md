# 7. Ship, watch, change

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 8, and
[`deployment.md`](../../frame/deployment.md).

## Ship

A revision is built once and moved, never rebuilt.

```text
$ forman promote --to staging
bundle 7f3e…c21 (rev a91c2e0)   test ok 17/17 operations
proving in staging … 17/17 ok   released @acme/sdk@1.4.0-next.1, @acme/cli@1.4.0-next.1
$ forman promote --to production
released 1.4.0   (a new operation since 1.3.0: minor)
```

The version comes from the model diff: a new operation is a minor change, a changed payload a major one.

## Watch

**Watch** runs the same evals on what production records.

```text
$ forman watch --env production
allowance.spend   p95 188ms / 150ms over budget   refused 9% (AllowanceExceeded)
```

That line is not a dashboard to stare at. It is a fact, and a fact makes a task:

```text
$ forman tasks --of allowance
improve  allowance.spend    over budget in production: p95 188ms against 150ms (watch, last 24 hours)
```

## Change

The manager briefs a builder with the trace that shows where the time goes (`allowance.spend.load`, by name). The fix
goes through the same loop: check, prove, verdicts, promote.

A change to the blueprint works the same way. Change `spend.ts`, and exactly what uses it goes **stale** and comes back
round. Nothing else does. That is what the model's **uses** graph is for.

Findings that touch money or security go to a person first, not to a builder.

## Today and proposed

> **Today.** `promote`, versioning from the model diff, release to a local npm registry and Homebrew tap, and `watch`
> all run locally. `watch` reports; it does not make tasks. There is no cloud yet.
>
> **Proposed.** Watch findings as a task kind (M3). The cloud, one destination at a time, each credential created
> only with Aaron's written yes (M7).

Back to [the story](story.md), or on to [concepts](concepts.md).
