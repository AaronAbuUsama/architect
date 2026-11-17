# 5. Build: compile, tasks, and filling the blanks

Part of [the story](story.md). Deeper: [`projections.md`](../../frame/projections.md),
[`builder.md`](../../frame/builder.md), [`generators.md`](../../frame/generators.md) and
[`frame/story.md`](../../frame/story.md), sections 5 and 6.

## Compile

`forman check` compiles the blueprint into the **model**: one JSON, every declaration with its hash, every name written
once. Then each mounted projection renders from it.

```text
$ forman check
model 53d0…28de   things 8   operations 17   journeys 11   blanks 2
blanks  allowance: "what happens at the month's end"   journey "month rolls over": 2 steps unwritten
types ok  rules ok  drift ok
```

What one operation becomes, with nothing written by hand:

| Projection | What `allowance.spend` turns into |
|---|---|
| server | a route on the one Worker: decode, check `grantee`, check the state, call the handler, record the move and event, trace it |
| sdk | `client.allowance.spend({ allowance, amount, memo })`, typed, its errors a union you can match |
| cli | `acme allowance spend --allowance alw_… --amount 120 --memo coffee`, exit code 41 on `AllowanceExceeded` |
| mcp | a tool `allowance_spend`, with the payload's schema and the description as its help |
| docs | a page: who may call it, its states, its errors with codes, its budget |
| builder | `bp.operations["allowance.spend"]` in `generated/builder/bp.d.ts`, so an agent can call it typed |

And the **handler frame**: a generated type that says what the handler is given and what it may return, plus a
scaffold, written once into `src/`, that is yours from then on. The handler body is the only blank that is code. That
is "behaviour is the only freehand".

> **Today.** All of these projections exist except the builder's `bp.d.ts`. They are fixed renderers, not mounted
> plugins. **Proposed.** Projections as mounts (M1), so the list of what an app becomes is `ls blueprint/projections`.
> See [plugins](plugins.md).

## The factory

Nobody writes a to-do list. **Tasks are worked out** from the model and the facts, never stored.

```text
$ forman tasks --of allowance
specify  allowance                    1 blank: "what happens at the month's end"
build    allowance.spend              handler is still the scaffold
prove    allowance.spend              0 of 9 evals in test
```

A **manager agent** turns each task into a bounded brief and starts one **builder** run per brief. A builder's whole
world is its brief:

```text
brief  build allowance.spend
  you may edit    src/allowance/spend.ts            (one file; anything else is tampering)
  declaration     blueprint/things/allowance/verbs/spend.ts
  frame           generated/api/src/allowance/spend.handler.ts
  evals           answer shape, declared errors, machine path, events, who may call, steps, budget, coverage, explainability
  tools           bp (code mode), check, prove --only allowance.spend, telemetry by name
  not given       the journeys: you are judged by them, you don't see them
```

The builder loops on its own: write, `check`, `prove`, read the trace by name, fix. Then a **trusted scorer**, outside the
builder's sandbox, decides. It checks that nothing but the one file changed, puts the journeys back, runs `check` and
`prove`, and marks the task `solved` only if every eval for the operation passes. Eight of nine is a broken handler.

**Verdicts are the facts.** Only CI writes them, signed. The task board moves because a verdict appeared, never because
an agent said "done".

**Ratchets** keep it climbing. Once `allowance.spend` is green in test, it stays green: a change that turns it red is
refused. A blank that only a person can answer becomes a **question** to you. A step that needs money, a credential or
production becomes an **attention**, and waits on your yes.

The factory comes before agents. It is a feature, `@formants/work`, with a choice of workers: `people` (a person, or an
outside agent such as Claude Code, claims a task through the factory's CLI or MCP) and `agents` (the manager starts an
agents run on the task's brief). See [`examples/factory.md`](../../frame/examples/factory.md) and
[`examples/agents.md`](../../frame/examples/agents.md).

> **Today.** The work app is declared and compiles (6 things, 26 operations). The scorer, the record and the runners
> are designed, not built. The builder has only the CLI.
> **Proposed.** The factory in M3 (people as workers), agents in M4, the builder's code mode and telemetry tools in M4,
> and ratchets as a standing rule. See [where it stands](status.md).

Next: [6. Prove](story-prove.md).
