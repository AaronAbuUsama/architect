# K15: the example app is Plugged In

Decided 19 November 2026 by Aaron, relayed by the conductor; recorded by the 📐 grid designer thread.

## Aaron's words

At 11:04 UTC: "I don't really like the name links. Let's call it plugged in. The application is called plugged in."

## The answer

The one growing example of K9 is **Plugged In**. Nothing about it changes but its name: the same four stages, the same
things (`profile`, `link`, `handle`), the same gates. It is a project, so its names are its own (`naming.md`, rule 5),
all formed from the slug `plugged-in`:

| What | Name |
|---|---|
| prose, the portal's title | **Plugged In** |
| the folder | `examples/plugged-in` |
| the app's command | `plugged-in` (`plugged-in handle claim --name aaron`) |
| a new project | `npm create orthograph plugged-in` |
| its packages | `@plugged-in/*` |
| each passing stage | the tag `plugged-in/stage-<n>` |
| its variables and SDK client | `PLUGGED_IN_URL`, `PLUGGED_IN_TOKEN`, `PluggedIn`, as the generators already form them from the name |

The full map is in `design/naming.md`, "The example app".

## Keeping Plugged In apart from "plugin"

"Plugged In" sits next to Orthograph's own word **plugin** (a feature, adapter or projection mounted with one file),
and the example is the place that teaches plugins: stage 1 mounts `@orthograph/handles` and auth. A reader must never
wonder whether "plugged in" means the app or "a plugin was mounted". So, in the docs, the canon, the portal and the
design files:

1. **The app's name is always written in full, both words capitalised: Plugged In.** Never "Plugged-In" or "PluggedIn"
   in prose, never shortened to "Plugged", never lower case ("plugged in" is only ever the ordinary English phrase,
   and the docs avoid even that near the app).
2. **The app is never called a plugin.** It is "the app", "the example" or "Plugged In". "Plugin" means only
   Orthograph's kind, and a sentence about mounting names the plugin by its package: "Plugged In mounts
   `@orthograph/handles`", never "Plugged In's plugin".
3. **Typed names use the slug `plugged-in`, always hyphenated.** Nothing named `plugin…` refers to the app, and nothing
   named `plugged-in…` is a plugin. The app's packages are `@plugged-in/*`; a plugin's are `@orthograph/*` (or its
   author's scope).
4. **Speech is the same.** Aaron listens rather than reads, so text written for him says "the Plugged In app" where
   "Plugged In" alone could be heard as a verb phrase.

Proposed for the canon thread, which owns `docs/canon/check.mjs` (this record edits no check): its check rejects
"Plugged-In", "PluggedIn" and lower-case "plugged in" in prose, outside code spans.

## What changed

| File | Change |
|---|---|
| `design/naming.md` | a section "The example app" in the map |
| `design/milestones.md` | renamed in place (it is the plan builders read), with a dated "Renamed by K15" line in "v1.0: four stages"; Codex's branch `links/stage-1` (#56) keeps its name |
| `design/decisions/K9-growing-example.md` | a dated "Renamed by K15" note under the title; the body keeps its words (rule 6) |
| `design/decisions/K13-lock-down-first.md` | the same note; the body keeps its words |
| `design/handoff.md` | a dated line under "START HERE"; the conductor keeps the rest of the file |
| `design/decisions/K14-the-grid.md`, `design/grid/grid.json` | renamed in place on their own pull request (#72), which is not merged |

## What did not change, and why

| Where | Why |
|---|---|
| the bodies of K9, K13 and K5 (`K5-the-whole-shape.md:689`), and `ledger.md:55` | dated records keep their words (`naming.md` rule 6); K9 and K13 carry the note |
| `design/evidence/`, `design/briefs/`, `design/history/` | records |
| `design/portal.md` (the frame drawing's `links`, "The worked app: `links`") | M1.25's agreed design (Aaron, 19 November); its owner, the portal design thread, renames it in its next pass, with `.agents/skills/portal-design/SKILL.md` (lines 23, 129, 133), which names `examples/links` |
| `.agents/skills/kanban/` (`data/tasks.json`, `lanes.json`, `meta.json`, `threads.json`, `STATE.md`) | the conductor's board and its live state; the conductor renames it |
| the handoff's thread table rows (`handoff.md`, "Links stage 1 (Codex…)", "the links app") | the conductor's living file, kept current by the conductor |
| Codex's branches `links/stage-1` and `codex/links-staging`, and pull request #56 | renaming a branch with an open pull request orphans it; M1.40 starts from it and writes `examples/plugged-in` |
| `docs/canon/` | it does not name the app yet: the canon's pass onto the example (K13) writes Plugged In from the start |
| code, `examples/`, `e2e/` | no code names the app: `examples/plugged-in` does not exist yet (M1.40) |
| every other match for "links" | the ordinary word (a page's links, `links:` in the canon's front matter, span links), not the app |
