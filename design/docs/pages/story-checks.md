# 4. Checks: making the journey executable

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 4.

A **different agent from the builder** turns each story into checks. That rule is what makes the checks honest: the
agent that fills a handler never wrote the test it must pass. The builder never edits a journey, the evals or the
runner's generic checks.

Each sentence becomes a step: a call by one of the cast, and what the evidence must show.

```ts
// journeys/revoke-then-spend.ts: executable. The builder never edits this file.
export default Blueprint.journey("revoke then spend", {
  cast: { ada: owner, olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("ada revokes it",
      s.ada.run(revoke, { allowance: s.world.allowance }),
      emits(AllowanceRevoked, { allowance: s.world.allowance }),
      machine.isIn(s.world.allowance, "revoked"),
      spans({ present: ["allowance.revoke", "allowance.revoke.update"] })),
    s.step("olga can't spend",
      s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, memo: "coffee" }),
      refuses(machine.notFrom, { state: "revoked" }),
      noEvents(),
      spans({ absent: ["allowance.spend.record"] })),
    s.step("olga can't revoke it either",
      s.olga.run(revoke, { allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ absent: ["allowance.revoke"] })),
  ],
});
```

The story's sentences become the step names, so the prose survives as the label on every result. A starting world is
made the same way, by running operations, never by writing rows.

## They must fail on empty handlers

The rule that proves the checks mean something: before any behaviour is written, the journey author runs them against
the scaffolds, and every step that needs behaviour must go red.

```text
$ forman prove --env local --only "revoke then spend"
revoke then spend   (handlers: scaffold)
  x ada revokes it                 allowance.revoke answered nothing; AllowanceRevoked not emitted
  x olga can't spend               not refused: the allowance is still active, so the empty spend ran
  ok olga can't revoke it either   refused NotAllowed (the role is checked before any handler)
2 of 3 steps fail on empty handlers. Step 3 needs no behaviour: it is proved by the role alone.
```

A step that passes on an empty handler is not a bug. It tells you that part is already guaranteed by the description:
here, the role keeps olga out with no code at all.

## Today and proposed

> **Today.** Executable journeys and starting worlds are real (`examples/acme/journeys/revoke-then-spend.ts`).
> Running them against empty handlers is a manual check. Journeys call the server over raw HTTP, so the SDK, CLI and
> MCP are never proved by a journey.
>
> **Proposed.** `prove --empty` as a standing check run by the journey author; journeys run through each client
> (the replay rule, in [`projections.md`](../../frame/projections.md)).

Next: [5. Build](story-build.md).
