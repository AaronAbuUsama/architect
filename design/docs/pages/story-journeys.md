# 3. Journeys and blanks

Part of [the story](story.md). Deeper: [`frame/story.md`](../../frame/story.md), section 3.

A journey is a short story through real operations, played by a cast, starting from a named world. The first version is
**prose only**. It is written during the idea, by you and your planning agent, before anything can run.

```ts
// journeys/revoke-then-spend.ts: a story, not executable yet
export default Blueprint.journey("revoke then spend", {
  cast: { ada: "owns the organisation", olga: "has an allowance of 500" },
  starts: "funded",
  story: [
    "ada revokes olga's allowance. It is revoked, and that is recorded.",
    "olga tries to spend 1. She is refused because it is revoked, and nothing is recorded.",
    "olga tries to revoke it herself. She is refused because she isn't allowed.",
  ],
});
```

A story is a blank with a shape. The compiler counts it, the portal shows it, and it says what the system must do in
words anyone can check. It is also what you hand a person who is not technical: they can read the journeys and say
"that's not what I meant" before a line of behaviour exists.

Starting worlds begin the same way. `funded` is "from founded, ada has granted olga 500".

## Blanks

A blank is something not yet known or not yet written. There are three kinds in the story:

- a question in the description, such as `Blueprint.todo("what happens at the month's end")`;
- a journey step that is still prose;
- a handler body, which is the only blank that is code.

A blank that only a person can answer becomes a **question** to you. A blank that code can fill becomes a task for a
builder ([chapter 5](story-build.md)).

## Today and proposed

> **Today.** Journeys are always executable. There is no prose stage: the planning happens in chat and is lost. The
> model leaves journeys out altogether, and drops an operation that still has a blank, so an unfinished model looks
> smaller instead of unfinished ([`delta.md`](../../frame/delta.md)).
>
> **Proposed.** `story:` as the first form of a journey, in the model, each unwritten step a blank. The blanks are kept
> in the model and counted.

Next: [4. Checks](story-checks.md).
