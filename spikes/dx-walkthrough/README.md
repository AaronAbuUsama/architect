# Spike: the Plugged In walkthrough

**Question.** Can a page show Plugged In's blueprint beside everything Orthograph makes from it, with every output
line linked to the declaration that made it, produced by the real compiler and generators rather than typed?

**Answer.** Yes. Codex's draft blueprint (#56) compiles and renders on `origin/m1` as written, apart from the three
K15 renames. Changing one declaration at a time and regenerating finds each declaration's lines with no hand mapping.
3,250 of 11,571 output lines trace to a declaration; the rest are the generators' own words, the same for every
operation. The page: https://claude.ai/artifact/FVQjGCEVzYj3ThNzYGdX75

## Run it

```bash
node spikes/dx-walkthrough/src/main.ts --fetch
```

It checks out `origin/m1` into `spikes/dx-walkthrough/.work/m1` (a git worktree, gitignored) and copies
`examples/links` from `origin/links/stage-1` into it as `examples/plugged-in`, applying K15's renames. It then runs
m1's compiler and generators against that copy and writes `data/walkthrough.json`. The page in `page/` renders only
from that file. `node spikes/dx-walkthrough/tools/site.mjs` assembles `.work/site/` for a local look. To update the
artifact, publish `page/index.html` with `page/*.js` and `data/walkthrough.json` as `walkthrough.json`.

Flags: `--m1`, `--source`, `--source-path`, `--k16` (refs), `--work`, `--out`. K16 is read from
`origin/claude/k16-scaffold-dfdb79`. When it isn't there, the page says so.

## What was tried

1. **Source.** `git archive` of `examples/links` at `links/stage-1` (ce7ff5b6), copied into an m1 worktree as
   `examples/plugged-in`. The renames are the package name, the bin and one README path (`src/modules/checkout`).
2. **The toolchain, unchanged.** The compiler runs as `node packages/compiler/src/main.ts <dir>`, as the sync
   generator runs it. `Render.files` from `packages/generators/src/modules/render/service.ts` is the same call
   `nx sync` makes. Nothing in m1 is patched.
3. **Declarations from the syntax tree** (`src/modules/anchors`). TypeScript's parser, loaded from the checkout,
   reads every `Blueprint.thing/machine/event/error/role/operation/visibility.*` call, each part of an operation and
   each shared value, with its `path:line`. There are 295 of them; 22 are wholes (a machine, a thing) whose lines are
   their parts' lines.
4. **Provenance by experiment** (`src/modules/trace`). For each of the 273 others: copy the blueprint, change that
   declaration a little, compile, render, and diff every output file against the unchanged render (Myers' diff).
   The output lines that moved are that declaration's. A change is: a string gets ` Zq`, a key gets `Zq`, a name is
   renamed everywhere it is used, a list item is removed, a number moves. A folder or verb file gets `-zq`, and its
   files are then compared with the renamed files.
5. **The runtime** (`src/modules/runtime`). Each step of the handler wrapper is found in m1's
   `handler/service.ts` and `internal/move.ts` by a line of its code. Whether a step runs for an operation comes from
   that operation's model.
6. **K16** (`src/modules/k16`): the worked example and the pre-handling map, parsed from the record on its branch.

## What was found

1. **The draft compiles on m1.** No fallback to acme was needed.
2. **Every declaration kind traces.** 266 of 273 changes found their lines. The 7 that didn't are field renames on
   `membership` and `organization`. The journeys read those fields by name, so the compiler refuses the change on its
   own: `can't load journeys/invite-and-accept.ts: TypeError: Cannot read properties of undefined (reading 'kind')`.
   The page shows them as "not traced", with the compiler's words.
3. **What reaches where** (from the data, for `handle.claim`):
   - The `budget` reaches the docs ("Budget: p95 150ms."), the portal data and the model. It reaches no generated code.
   - A declared refusal (`HandleTaken`) reaches the API's errors, the endpoint, the docs, the portal data, the model
     and the scaffold. It reaches neither the SDK, nor the CLI, nor MCP.
   - A thing's TypeScript name (`Handle`) reaches no output at all. In the first run, renaming each of the ten things'
     names moved nothing, so a thing is now traced as the sum of its parts.
   - The app's name, from its folder, reaches 92 lines in six outputs. These include the CLI's command and its
     `PLUGGED_IN_URL`, the SDK's `PluggedIn` client, the API's and MCP's names in the server, and every docs page's
     "How to call".
4. **Some lines come from everything.** The portal's `digest` and a few hash lines move with any change. Lines that
   move with more than half the changes are marked as a fingerprint of the whole blueprint, never pinned on one
   declaration.
5. **The model has no lines.** It carries `file` but no line numbers, so `path:line` comes from the script's own parse.
   K16 (d) chose the same: files only in the model.
6. **K16's worked example is acme's `allowance.spend`.** There is no Plugged In one yet. The page shows it under
   "K16, proposed" and says so. K16's map has 23 rows: 10 say done, and 13 are proposals (M1.44, M1.45, M2.17 to
   M2.19, later). A row that is done only in part ("done at run time; at compile time in M1.44") is counted as
   proposed.

## Measurements

| What | Value |
|---|---|
| Declarations read | 295 (273 changed, 22 wholes) |
| Output files, lines | 140 files, 11,571 lines |
| Lines traced to a declaration | 3,250 |
| One full run (fetch excluded) | about 95 s; the compiler subprocess is most of the 0.35 s per change |
| Data file | 625 KB |

## The decision it supports

K16's header and the page say the same thing from the same facts: who may call, refusals, the machine, and what the
runtime does. Provenance by experiment works against the real toolchain today, so a generated "where did this line
come from" view (portal, M1.13) can rest on it, or on line numbers the compiler adds later. It needs no hand-kept
map.

## Open risks

- A diff can pin a change on a different copy of an identical line, for example the second of two blank lines.
- Journeys, environments and starting worlds are not traced; only the blueprint's declarations are.
- The runtime captions are written by hand; the code beside them is cut from m1's source. A step whose code line
  changes makes the script fail, not drift.
- The page's layout (blueprint left; outputs stacked on the right, not in tabs) was chosen without a grill. It is
  easy to change.
