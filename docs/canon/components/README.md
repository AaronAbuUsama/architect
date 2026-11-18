# The canon's components

Five MDX components, used by every page. Only their props are written so far (`types.ts`). A React site renders them
later, in its own thread. Until then, `docs/canon/check.mjs` checks each use against the repository, so a page can't
point at a journey, a scene or a decision that doesn't exist.

## `<Note>`: what the page knows is unsettled

A page carries its own open questions, the decisions that settled earlier ones, and how far the code is behind it.
Notes live in the page's last section, `## Notes`.

```mdx
<Note kind="question" id="store-capabilities" slice="M1.17">
  How does a store kind declare what it can do (lists, search, private state)?
</Note>
<Note kind="decision" decision="K3">Option C: a thing lives in a store of an open kind.</Note>
<Note kind="status" slice="M1.17">Today `lives` is a closed list.</Note>
```

- `question` needs an `id`, unique on the page, so a decision can say which question it closed.
- `decision` needs a `decision`: a record in `design/decisions/` (the check opens it).
- `slice` must be a slice in `design/milestones.md` (the check finds it there).

## `<Scenario>`: a real journey, never a story about one

```mdx
<Scenario journey="examples/acme/journeys/spend-within-allowance.ts" step="olga spends some" />
```

The site reads the journey's file and renders its steps and assertions. Once verdicts are published it adds the
evidence each step left: its spans, its events. The check opens the file and finds the step's name in it. Prose
retellings of a journey are not allowed anywhere in the canon: if a page needs one, it needs a journey.

## `<Model>`: rendered from the compiled model

```mdx
<Model project="examples/acme" thing="allowance" show="fields" />
<Model project="examples/acme" operation="allowance.spend" show="steps" />
<Model project="examples/acme" stores />
```

The site runs `ortho check` on the project and renders from the model, so a field added to the blueprint appears on
the page with nothing else changing. Until the site exists, the check confirms the project exists and the thing has a
folder under `blueprint/things/`.

## `<Scene>`: an animation, where a path matters

```mdx
<Scene name="handler-lifecycle" caption="Watch where each refusal leaves the call, and that the commit comes last." />
```

A scene is a file in the visuals skill's `scenes/` folder, rendered to MP4, GIF and a poster PNG. Animate when the
point is order or a path; a still (`still={11.5}`) is enough when the point is shape. The skill and its scenes are on
`spike/visual-content` (PR #34). Until that merges, the check accepts the three scene names that branch has, and the
site will show the poster.

## `<Status>`: the page's status, from its frontmatter

```mdx
## Status

<Status />
```

It reads `status`, `milestone`, `slices` and `decisions` from the frontmatter. The table under it breaks the page down
into parts, each with its own status and the check that proves it.

## Fences that quote code

Not a component, but the same rule. A fence that quotes a file says which lines:

````mdx
```ts file=packages/language-effect/src/modules/records/types.ts lines=40-41
/** `conflict`: an update's version had moved on, so nothing was written and the call runs again. */
export type Committed = "committed" | "conflict";
```
````

The check compares the fence with those lines, ignoring only leading and trailing whitespace on each line. Code that
is designed but not built yet says which slice builds it, and is not compared:

````mdx
```ts planned=M1.17 path=blueprint/stores/ledger.ts
export default Blueprint.store.database();
```
````

Inline references, such as `packages/forman/src/modules/things/types.ts:32`, are checked the same way: the file must
exist and have that line.
