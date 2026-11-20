# K24: UI SDK is the interface base, and HeroUI is phased out

Decided 20 November 2026. Aaron's own yes, to the conductor, the same day: "yes this is a go". The direction is his;
the steps, the pin and the order below are the building agent's (`AGENTS.md`, "Who decides"). It amends F7 and K19.

## Aaron's words

From the Capxul session, 20 November 2026, after UI SDK was explained to him: "It's a Vercel thing, so it's going to
be supported. And it fits the philosophy of our framework. So if we're going to do it, which I think we should do it,
we should go in all the way. We should phase out Hero UI and rebuild everything like this. I think that would be the
maximum value ... And then we wouldn't need to scope creep anymore ... if we did want to add anything, it would fit
into a logical place."

## What UI SDK is

`github.com/vercel-labs/ui`, published as `@ui-sdk/core` with `@ui-sdk/react`, `@ui-sdk/web`, `@ui-sdk/vue`,
`@ui-sdk/svelte` and `@ui-sdk/solid`. Read from its source tree (contributing/architecture.md, the agents docs,
`packages/core/skills/ui-sdk/references`) by the Capxul session, 20 November 2026:

- **One description, every framework.** `definePrimitive` takes a required `options` schema (kinds: string, number,
  boolean, list, value, callback, action, id, key) plus `state`, `api`, `slots` and `agent: { actions }`. Every
  change goes through `createChange` to `on<Key>Change(value, details)`, where `details` carries `reason`, `source`
  (`keyboard`, `mouse`, `agent`, `programmatic`) and `cancel()`.
- **51 components**, among them Field (label, description, error), Input, Number Input, Select, Combobox, Listbox,
  Pagination, Tree, Timeline, Date Picker, File Input, Dialog, Menu and Toast. Forms submit natively through a hidden
  native input.
- **An optional stylesheet**, `@ui-sdk/core/web.css`, in `@layer ui-sdk`, themed by `--ui-*` tokens (background,
  primary, border, radius, spacing, fonts). A plain working app needs no second library.
- **An agent bridge.** Three marks, `data-agent-confirm="<sentence>"`, `data-agent-secret` and `data-agent-hidden`;
  `createAgent({ allow })` decides or asks a person. `createHistory` and `stageChanges` exist and are marked
  experimental.
- **Missing:** a data grid or table, and a kanban board. Reordering is a behaviour (`createReorder`,
  `createTransfer`) to build on.

Versions on npm, checked 20 November 2026: `0.1.0-beta.1` (12 November) to `0.1.0-beta.13` (19 November), about one
a day.

## Why it fits

The blueprint is declared once and every output is generated from it. UI SDK does the same for components: one
description, rendered in React, Vue, Svelte, Solid and web components. Its agent bridge is the browser half of what
the blueprint already knows: an approval, a secret, a hidden field, and whether a change came from a person or an
agent. HeroUI Pro is React only, licensed per project, and can't be a dependency of generated code (F7 kept it behind
one package for that reason).

## Decided

1. **Spikes first.** The first is done: `spikes/ui-sdk-verb-primitive` (PR #215) generated Plugged In's
   `handle.claim` as one UI SDK primitive (73 lines) that renders in React and as custom elements; the agent bridge
   lists it with only the actions the generator named, a call carries whether a person or an agent made it, and a
   declared refusal fails the agent's step with its code. It ran against a stand-in server in jsdom. The second
   (`spike/ui-sdk-real-world`) takes the same form through Plugged In's real generated SDK into a local world, in
   Chromium, replays a real journey's claim step, and settles how blueprint meaning maps onto the agent marks:
   `Blueprint.issued` to `data-agent-secret`, private visibility to `data-agent-hidden`, an approval to
   `data-agent-confirm`, and `source === "agent"` to a way in that a role can exclude (the Capxul session's sketch,
   not yet a decision). Nothing in `packages/` depends on UI SDK until the second spike passes.
   The first spike's finding is the rule: the page is generated from the blueprint onto UI SDK as its own output, and
   never hand-written against UI SDK.
2. **Everything new uses UI SDK from the start**, once the spike passes: generated forms, inputs, buttons, lists
   and screens, and the example apps' screens, which become generated rather than hand-written. HeroUI never touches them.
3. **The portal moves over piece by piece**, behind the same seam. `@orthograph/portal-ui` keeps its own names
   (F7, decision 2); their insides change from HeroUI Pro to UI SDK one export at a time. The data grid and the board
   go last, because UI SDK has neither: we build them on its behaviours, as F7's fallback already planned for the
   board (dnd-kit then, `createReorder` and `createTransfer` now).
4. **HeroUI comes out** when nothing imports it: the Pro peer dependency, the `HEROUI_AUTH_TOKEN` install, the lint
   ban's exception and the CI cache all go in the same change.
5. **Pin exactly, three days old.** UI SDK is a beta that changes daily. It is pinned like every dependency
   (R1): the newest version at least three days old when it's added (today that is `0.1.0-beta.7`, 17 November). A
   younger version needs R1's override, with the reason.

## What doesn't change

- Work in flight carries on with HeroUI until step 3 reaches it. Goal 3's portal work is not paused.
- The seam stays: only `@orthograph/portal-ui` imports a component library for the portal. Generated code imports
  UI SDK directly, which is open source (Apache-2.0), so no licence seam is needed there.
- The free HeroUI 3 primitives F7 allowed anywhere (`Button`, `Chip`, `Card`) are not used in new code.

## Gaps it raises

These are recorded here and go into `design/ledger.md` and `design/later.md` once the open money-gap change lands.

- **Generated screens aren't planned anywhere.** ST1.01 builds hooks only; ST1.04's three screens are written by
  hand. The spike says whether a screens output belongs in stage 1 or later.
- **Named value kinds.** Plugged In's `generated/model/model.json` carries `HandleName` and `LinkUrl` only as
  `{ "type": "schema" }`, so no generator can tell a web address from a pattern and choose the right input. Named
  value kinds (a web address, a pattern, a choice, yes or no) would fix it for every output, not only screens. This
  is the language's to design, beside `THI-02` in the ledger.

## Risks

- **A week-old beta.** Interfaces may change between betas; the spike pins one and records what it relied on.
- **The grid and board are ours to build.** They are the portal's largest parts.
- **Experimental pieces.** `createHistory` and `stageChanges` are marked experimental; nothing depends on them until
  they aren't.
