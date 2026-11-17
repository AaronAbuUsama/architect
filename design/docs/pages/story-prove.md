# 6. Prove: worlds, evidence, verdicts

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 7, and
[`deployment.md`](../../frame/deployment.md).

A **world** is a running copy of an environment, made for a purpose and destroyed after: its own storage, clock and
cast. `prove` makes one, builds each starting world by running operations, plays every journey, and judges the evidence.

```text
$ forman prove --env local
world w_4k2 (test, 2 hours)   adapters: none   cast: ada, olga, bob
journeys 11/11 ok   through: api ok  sdk ok  cli ok  mcp ok
allowance.spend   evals 9/9 ok   p95 41ms / 150ms   journeys: spend within an allowance, spend twice with one request, revoke then spend
verdicts written for revision a91c2e0 (signed by CI)   world w_4k2 destroyed
```

## What happens for one call

1. olga's spend arrives at a door. The role `grantee` is checked before any code of ours runs.
2. The state is checked: `revoked` is not a `from` of `spend`, so it is refused with the generated error.
3. If it gets through, the handler runs inside spans named by the model: `allowance.spend`, `.load`, `.record`.
4. The move and the event are recorded. The answer goes back.
5. Everything it left (caller, answer or refusal, events, spans, logs) is **evidence**, under model names.
6. The nine **evals** read the evidence and judge it against the declaration. Together they are the operation's
   **verdict** at this revision, in this environment. It goes into the **logbook**.

The same journey played through the SDK, the CLI and MCP must leave the same evidence. That is how a client is proved,
not just the server.

## The nine evals

Answer shape, declared errors, machine path, events, who may call, steps, budget, coverage, explainability. A tenth,
for time, is proposed.

## Each plugin brings its proof

- A **feature** brings journeys, proved in its own example app and again in every app that mounts it.
- A **projection** that callers use replays every journey it takes through itself.
- An **adapter** brings a conformance test against a stand-in that runs in the world.

See [plugins](plugins.md).

## Today and proposed

> **Today.** Worlds, the nine evals, signed verdicts and the logbook run locally. Verdicts are keyed by the blueprint's
> hash, not by the handler code they judged, and the logbook keeps one pass or fail per run. Journeys skip the clients.
>
> **Proposed.** Journeys through every caller projection; one verdict per operation, keyed by model and handler hash
> ([`delta.md`](../../frame/delta.md), proof).

Next: [7. Ship, watch, change](story-ship.md).
