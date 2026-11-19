# Spike: React Flow for every graph in the portal

## Question

Aaron, 19 November 2026: "What if we were to use React Flow for a lot more things, like for the blueprint and for state
machines and things like that? How would that work?"

The question has four parts:

- Can one `Graph` component, over `@xyflow/react`, draw every graph view the portal has?
- Can it draw them from the model alone, with nothing placed by hand?
- Can it draw them with our own components as nodes?
- Does it fit the repository's rules (pinning, licences, Effect, no Pro surprises), and which slice owns it?

It must not block M1.13, which builds from the agreed wireframe.

## Tried

One `Graph` component and five views, drawn on Plugged In's stage 1 model. They are shown as a **Graphs** page in the
portal drawing (`spikes/portal-site`, route `graphs.html`), published with the rest of it at
https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj.

```text
model ──view (pure)──▶ GraphSpec ──layout (elk, at generate time)──▶ Laid ──<Graph lighting>──▶ React Flow
                       nodes, edges     positions, sizes, edge routes        structure | live | trace
```

| File | What it is |
|---|---|
| `src/graph/types.ts` | The whole surface: `GraphSpec` (kinds of node and edge, no positions), `Laid` (placed), `Lighting` |
| `src/graph/layout.ts` | elk's layered algorithm, orthogonal routes, plugin groups as compound nodes |
| `src/graph/graph.tsx` | `<Graph>`: React Flow, read-only, routed edges from elk's bend points, hover lights neighbours |
| `src/graph/nodes.tsx` | Our nodes: thing card, plugin group, state, world, journey card (the kit's `VerdictTile`), sketch nodes |
| `src/graph/graph-view.tsx` | A `Graph` with a `Segment` to switch its lightings |
| `src/views/blueprint-map.ts` | Things inside their app or plugin; refs, payload refs, the `on:` handler, mounts, needs |
| `src/views/machine.ts` | States and moves; live counts per move; a trace read from one journey's checks |
| `src/views/worlds.ts` | The `from` chain of starting worlds, and each journey on the world it starts from |
| `src/views/sketches.ts` | Hand-written until their slices land: a workflow (M3.01), the chain view (K17) |
| `src/layout-check.ts` | Lays out every view and prints sizes |
| `tools/setup.sh` | Installs the two pins, and links React and HeroUI to the drawing's one copy |

Pins (`package.json`, exact):

- `@xyflow/react` **12.12.1**, published 2 November 2026, MIT.
  - 13.0.0 and 13.0.1 (16 November) turn three days old during 19 November; 13.0.2 (17 November) doesn't until the 20th.
  - So the spike stays on 12. `portal-ui` re-checks 13 when it adds the dependency.
- `elkjs` **0.12.1**, 28 October 2026, EPL-2.0 OR GPL-3.0-or-later.

To run it: `tools/setup.sh`, then `spikes/portal-site/tools/build.sh` builds the Graphs page with the rest of the site.

## Found

**1. One component draws them all.** The five views share one `Graph`. They differ only in their spec and their
lighting:
- the blueprint map, both machines, worlds and journeys;
- the two sketches.

The nodes are our components. React Flow never draws a default box: every node type maps to a kit component, and the
edges are our own routed edge.

**2. Everything falls out of the model.** Each view is a pure function from the model to a `GraphSpec`; elk places it.

- **Blueprint map:** five things in three groups (the app, `@orthograph/handles`, `@orthograph/auth`). Its edges:
  - field refs (`owner`, `handle`, `person`);
  - payload refs (`profile.get { handle }`, `session.sign-in { email }`);
  - the mounts, and handles' `needs: auth`.

  Each thing's card carries its states and the events its moves emit. The one `on:` edge, `HandleClaimed → on:
  profile.create`, is declared in K9 (`K9-growing-example.md:105`) and waits on M3.08. The map draws it dashed and
  marked "planned · M3.08", from a one-line `handlers` constant that `Model.handlers` replaces.
- **Machines:**
  - **Structure:** states and moves.
  - **Live:** puts moves answered in the window on each arrow (stroke weight by count). No counts on states: the
    no-populations rule holds by construction, because `Lighting` can only address edges.
  - **Trace:** reads one journey's step checks:
    - `emits …` lit the move it made;
    - `refuses …` marks the move it tried, with the code and step;
    - an answer with no event (a replay) made no move.

    For `edit-a-public-page`, link's machine reads "add · moved at step 2" and "remove · moved at step 6 ·
    LinkNotListed at 7".
- **Worlds and journeys:** the empty world, the two worlds, and three journeys on the world each starts from.
  - Stage 1's worlds both have `from: null`, so the chain is one step deep. A chained world would add one edge, with
    no new code.
  - **The journey sequence diagram stays as it is.** A journey is an ordered conversation between actors. A layered
    graph would lose the order, which is the point of that view, and Aaron called the sequence a win. Graph is for
    "what hangs off what"; the sequence is for "what happens in order".
- **Sketches:**
  - **Workflow (M3):** activities, an await, a durable clock that fires first. Shaped on ST3.02's signature
    collection.
  - **Chain view (K17):** each operation in its target's group: device, server, chain. Stage 2's payment.

  Both sketches are hand-written specs. When the model carries workflows and targets, a view function replaces each
  one.

**3. Layout belongs in the generator, not the browser.**
- elk is 1.6 MB. Its first layout takes 3.7 s and later ones about 0.5 s.
- It is deterministic: two runs give byte-identical JSON.
- So it runs where the model is generated, and the portal's data carries positions. This fits AGENTS.md
  ("generators never run in production") and M1.13's check ("screenshots byte-identical across two runs at the same
  `now`").
- Live numbers and traces are a separate `Lighting`, so they never move a node.
- The browser gets React Flow only: about 190 KB minified, 63 KB gzipped.
- elk's EPL/GPL licence then never ships in the portal bundle. As an unmodified dependency of a build step it puts no
  obligation on our MIT code.

**4. elk over dagre.**

| Need | elk (chosen) | dagre |
|---|---|---|
| Plugins as groups around their things | compound nodes, edges routed across group borders | compound support is weak, no routing across groups |
| Edges that don't cut through cards | orthogonal routes with bend points | straight polyline points only |
| Labels kept clear | edge labels placed in the layout | none |
| Licence | EPL-2.0 OR GPL-3.0 (stays in the generator) | MIT |

dagre would do for machines alone; the map needs groups.

**5. Nothing we need sits behind React Flow Pro.**
- Pro sells examples, prioritised issues, support, and the right to hide the small "React Flow" link in the corner.
- Everything used here is in the MIT library: custom nodes and edges, parent nodes, the viewport, controls and SSR.
- The attribution link stays visible; that is the condition of not subscribing.

**6. React Flow renders on the server.**
- With sizes and handles on each node, `renderToStaticMarkup` prints every node, edge and label, so the page shows the
  graph before scripts load. The island then mounts for hover, pan, pinch and the lighting switch.
- One build fix: zustand (React Flow's store) reads `import.meta.env`, which breaks an IIFE bundle. Fixed with a
  `--define` in the drawing's build.

**7. Read-only first.** Nothing is dragged, connected or deleted.
- Editing (drag out a new move or state) would write the blueprint file. It is an editor feature, and it is recorded
  in `design/later.md`, not here.
- Read-only is also why the layout can live in the generator. An editor would need elk in the browser (a worker),
  which is one of the reasons editing waits.

## Decision it supports

**`Graph` is one `@orthograph/portal-ui` export over React Flow, laid out by elk in the generator.**
- It draws the machine, the blueprint map and the worlds chain from the model.
- Workflows and the chain view join when the model carries them.
- The journey sequence stays its own view.

**Owner: a new slice, M1.50, after M1.13.** M1.49 is K18's monitoring slice, so M1.50 is the next free row.
- **Floor-first:** M1.13 already needs a machine diagram ("a journey's run lights up its operation and machine move"),
  and the agreed wireframe draws it as a small SVG strip (`spikes/portal-site/src/ui.tsx:53`). M1.13 builds that strip
  and stays unblocked.
- **The swap:** M1.50 replaces the strip with `Graph` and adds the map and the worlds chain. The strip is about 30
  lines thrown away.
- **Why not M1.13 itself:** it is already L and waits on ten slices. Adding React Flow, elk and a generator step to it
  would make it larger and later.
- **Why not M1.34 (portal-ui):** that slice is the Pro seam. `Graph` is ours over a different library, and needs
  M1.42's wire (events with their fields, `from`) before it can draw the map.

Proposed row:

| ID | Slice | Needs | Kind | Done when | Size |
|---|---|---|---|---|---|
| M1.50 ∥ | One `Graph` in `@orthograph/portal-ui` (`spikes/react-flow-graphs`):<br>• over `@xyflow/react`, pinned at the time;<br>• laid out by `elkjs` in the generator (positions in the portal's data, never in the browser bundle);<br>• our components as nodes.<br>Views from the model: each machine (structure, live counts on moves, a trace from a journey's run), the blueprint map (things in their app or plugin; refs, payload refs, `on:` handlers, mounts, needs), and the worlds' `from` chain with the journeys on each.<br>Replaces M1.13's lifecycle strip. The journey sequence stays. | M1.13, M1.34, M1.42 | build | Plugged In's portal draws its map, both machines and the worlds chain with no position written by hand; two generations give byte-identical layouts; a journey's run lights its path on the machine and no state shows a count; the portal bundle holds no elk | M |

## Open risks

- **React Flow 13.** It was released on 16 November; the API delta from 12 is unread. portal-ui pins whatever passes
  the three-day rule when M1.50 starts, and reads the changelog then.
- **The map at scale.** Plugged In's map has five things. A blueprint with 40 things and many refs will tangle.
  Remedies, none needed yet:
  - collapse a plugin to one node;
  - filter by edge kind (the legend already names them);
  - open the map focused on one thing.
- **elk's first-run cost** (3.7 s here, a GWT warm-up) lands on `ortho generate`. Reusing one ELK instance across
  graphs, or caching layout by model hash, keeps it to one warm-up per run.
- **Label widths are estimated** from character counts, not measured. A very long field or operation name may crowd
  its edge. The generator can't measure text, so a font-metrics table is the fix if it shows.
- **One React in the spike** depends on symlinks (`tools/setup.sh`). In the workspace, pnpm and portal-ui's peer
  dependency do this properly.
