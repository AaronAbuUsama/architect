# 1. The idea

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 1.

It starts as a conversation with your agent, in chat, on a diagram, or in Figma.

```text
you    Members should be able to spend company money without asking each time. Up to a limit, monthly.
agent  So a new thing, an allowance: one organisation, one member, a limit, what's been spent.
       Who can grant one? Only the owner?
you    Yes. And they can revoke it.
agent  States, then: active, exhausted when it's all spent, revoked. Can a revoked one come back?
you    No.
agent  What happens if a spend is more than what's left?
you    Refuse it, and say how much is left.
agent  And a phone that retries the same spend after a timeout?
you    Spends once.
```

What comes out is not code yet. It is three kinds of fact, each with a place in `blueprint/`.

| From the conversation | Becomes |
|---|---|
| "an allowance has a limit and what's spent" | a **thing**, with fields |
| "active, exhausted, revoked; revoked is final" | a **machine**: states and moves |
| "only the owner grants", "say how much is left", "spends once" | **operations**, with roles, errors and `idempotent` |
| "the owner revokes, then the member can't spend" | a **journey**, written as a story |

A state diagram drawn in FigJam or as UML is the machine. Three boxes and three arrows are exactly `states` and
`moves`. Forman can draw the machine back as the same diagram, so the picture and the code are the same thing seen
twice (the docs projection, in [`projections.md`](../../frame/projections.md)).

## Blanks

Anything you don't know yet stays a **blank**: `Blueprint.todo("what happens at the month's end")`. A blank is a
question, not a gap. It is written down, it shows in the model, and it becomes a task. [Chapter 3](story-journeys.md)
says more.

## Today and proposed

> **Today.** Blanks exist (`Blueprint.todo`), and the compiler finds them. No tool turns a conversation or a diagram
> into a blueprint: the agent writes the files by hand.
>
> **Proposed.** The planning agent writes straight into `blueprint/` through the builder's `bp.write`
> ([`builder.md`](../../frame/builder.md)), and `forman check` answers in the same turn. A FigJam or Mermaid state
> diagram is read as a machine, and drawn back from one.

Next: [2. The blueprint](story-blueprint.md).
