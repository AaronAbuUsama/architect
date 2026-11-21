# K36: a composite component declares its wiring; its behaviour stays yours

**Decided 21 November 2026 by Aaron.** On the canon map, he asked how an app's author builds a component that is more
than one operation ("some components are compounds of other things that don't just fall out of an operation"). He was
shown three positions with the steelman and strawman of each: A, hand-written (K29 section 5); B, fully declared,
behaviour included; C, the wiring declared and the behaviour hand-written. His answer: "C, wiring declared."

It reopens one line of K24, Aaron's own: "No `Blueprint.component` or `Blueprint.screen`" and "Reopen only if a
component carries meaning no operation has." K31 already reopened the screen half: a page declares what it shows and
offers. A composite component carries the same meaning one level down, which no single operation has: which reads a
region of a screen shows and which moves it offers together. The docs, the agent's map, journeys and the compiler need
that grouping, as they need a page's.

## The problem, in code

Plugged In's link list on `/edit` shows `profile.get`'s links and offers `link.order` and `link.remove`. K29 has the
author write all of it (`design/decisions/K29-ui-layer.md`, section 5):

```ts
// src/web/link-list/link-list.ts (K29 section 5): all hand-written
export const linkList = definePrimitive({
  name: "link-list",
  controlled: ["value"],
  api: (context) => { /* the reorder behaviour, wired to linkOrder by hand */ },
  agent: { actions: ["moveTo"] },
});
```

So nothing generated knows it exists: the page declaration lists `shows: [get]` and `offers: [add, order, release]`
(K31, `blueprint/app/pages/profile.ts`), but not that three of those live together in one component. The docs page for
the screen, the agent's map and a journey can't name it. A renamed operation breaks it only at type-check, and an
author who forgets `controlled` leaves it unseen by an agent, with nothing to say so.

## Decided

1. **A component that shows a read or offers an operation is declared** in `blueprint/app/components/<name>.ts`,
   named by its path like every declaration. It says what, never how:

   ```ts
   // blueprint/app/components/link-list.ts
   import { Blueprint } from "orthograph";
   import get from "../../things/profile/verbs/get.ts";
   import order from "../../things/link/verbs/order.ts";
   import remove from "../../things/link/verbs/remove.ts";

   export default Blueprint.component({
     description: "Your links, in order; move one or remove it.",
     shows: [get],
     offers: [order, remove],
   });
   ```

   A page holds it: `Blueprint.page({ …, components: [linkList] })`. A component with neither a read nor an operation
   (a picker, a decoration) is plain UI SDK, as before, and is not declared.

2. **The wiring is generated; the behaviour is yours.** The web projection emits the component's wiring once per
   declaration: its data typed from the shown reads' answers, its offered actions through the host, its agent
   manifest (the offered operations as `agent.actions`, the shown data as `controlled` state) and its description.
   `ortho add component <name>` scaffolds the primitive once ("Scaffolded from … Yours from now on."), spreading that
   wiring, and the author writes only the behaviour, on UI SDK (`createReorder` here):

   ```ts
   // src/web/link-list/link-list.ts: scaffolded once, then yours
   // Scaffolded from blueprint/app/components/link-list.ts. Yours from now on.
   import { definePrimitive, createReorder } from "@ui-sdk/core";
   import { component } from "../../../generated/web/components/link-list.ts";

   export const linkList = definePrimitive({
     ...component.linkList,                 // data, actions, agent manifest: generated
     api: (context) => { /* the reorder, through component.linkList.actions.order */ },
   });
   ```

3. **The compiler checks it,** as K31 checks a page, each a compile error naming the file: a component that offers an
   operation none of the `allowed` roles of a page holding it may call; and a component's shown read whose payload no
   parameter, session or role of a page holding it supplies. These two join K31's four.

4. **What falls out of it:** the agent's map names the component on its page, with what it offers; the screen's docs
   page in the portal lists it; a journey can act on it (`on(pages.edit, components.linkList).order(…)`); a renamed
   or removed operation fails at compile time, naming the component's file.

5. **No behaviour vocabulary in the blueprint** (B, not chosen): reorder, drag, transfer and the rest stay UI SDK's.
   A new interaction needs no framework change.

## Who builds it

Nothing is built yet. Neither Goal 5 nor Goal 6 has started, so their briefs take this now:

- **Goal 6** (the map language, slice 3) adds `Blueprint.component`, `model.app.components`, a page's `components`,
  and the two compile errors, beside K31's four.
- **Goal 5** builds the link list hand-written first (slice 5), as K29 says, since the map language lands later. The
  follow-on slice that declares Plugged In's pages in `blueprint/app/` declares the link list as a component too, and
  the web projection gains its wiring there, scaffolding over the hand-written file with the same behaviour.

## Not chosen, and why

- **A, hand-written only:** the simplest, but every derived output is blind to the component, and the wiring is
  rewritten in every app.
- **B, behaviour declared too:** the most falls out, but the blueprint grows a UI vocabulary that has to track UI SDK
  forever, the scope creep K24 meant to end, and it still needs an escape hatch.

## Reversible

A component is one file. Deleting its declaration leaves a working primitive, since the scaffold is the author's code;
only the derived listings and the two checks go.

## Supersedes

- .agents/skills/ui-sdk/README.md: "that nothing generated fits, like an editor" → "that shows a read or offers an operation (declared in `blueprint/app/components/`, its wiring generated, K36), or that nothing generated fits"
- design/milestones.md: "with the app's own link list (K29)" → "with the app's own link list (K29; declared as a component once the map language lands, K36)"
- design/goals/05-ui-layer.md: "Plugged In's three pages are declared in `blueprint/app/` (K31)" → "Plugged In's three pages and its link list are declared in `blueprint/app/` (K31, K36)"
- design/goals/06-portal.md: "`Blueprint.app`, `Blueprint.page`, `Blueprint.layout`, `Blueprint.nav` in" → "`Blueprint.app`, `Blueprint.page`, `Blueprint.component` (K36), `Blueprint.layout`, `Blueprint.nav` in"
- design/goals/06-portal.md: "the compiler's four refusals (K31)" → "the compiler's six refusals (K31's four, K36's two)"
- design/goals/06-portal.md: "its hash and the four refusals" → "its hash and the six refusals (K31, K36)"
