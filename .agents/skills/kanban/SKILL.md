---
name: kanban
description: The Orthograph Kanban, the board Aaron and the conductor track every slice and thread on (a claude.ai artifact with a shared database). Read it to see where the project stands, to update a task when a thread changes stage, to rebuild the board from its template, or to save its data into the repo. STATE.md beside it is the latest snapshot in words.
---

# The Orthograph Kanban

**The board:** <https://claude.ai/artifact/4UH7mYegtpWM9rq4f1ZAJw> (private to Aaron's account; open it signed in).
It shows every slice of `design/milestones.md` as a card in its milestone's lane, which thread has it now and had it
before, open questions on each task, and the critical path at the top. Aaron's words: it is "for me and you, the main
orchestrator".

**Where things are:**

| Path | What it is |
|---|---|
| `STATE.md` | Where the project stands, in words, at the last snapshot: read it first |
| `data/tasks.json`, `threads.json`, `lanes.json`, `meta.json` | The board's whole database at the last snapshot, `{id: document}` |
| `template/index.html` | The page, exactly as published (one file, no build step) |
| `scripts/snapshot.py` | Folds an export into `data/` |
| `scripts/seed.py` | Turns `data/` into batch files to seed a new board |

The live database is the source of truth; `data/` is its last saved copy. Save one before any long pause.

## The data

Four collections, every document JSON. The page reads all four live (`onSnapshot`) and writes only `tasks`.

- **`tasks/<id>`.** The id is the slice with a dash (`M1-35`, `ST1-07`), or `X-…` for work outside the milestones.
  - Identity and copy: `ref` (`M1.35`), `lane` (`M1` … `M7`, `ST1` … `ST4`, `X`), `title`, `plain` (one plain line), `what`, `needs[]` (refs, `M1.11` form), `doneWhen`.
  - Where it stands: `stage` (`backlog`, `decide`, `checks`, `build`, `review` or `done`), `thread` (a `threads` id), `waiting` (`"aaron"` or null), `pr` (number or null), `updatedAt`.
  - `history[]`: `{stage, thread, at, note}`, appended, never rewritten.
  - `questions[]`: `{id, text, status: open|answered, owner, answer, raisedAt, answeredAt?, source}`.
- **`threads/<id>`.** `name`, `emoji`, `kind` (`person`, `claude`, `codex` or `subagent`), `status`, `role`, `sessionId` (the real `local_…` id), `branch`, `pr`.
- **`lanes/<id>`.** `name`, `summary` (shown under the lane), `goal`, `ships`, `gate`, `needsFrom`, `workable` (M2 only), `order`.
- **`meta/critical`.** The critical path to Gate M2, curated by the conductor: `{goal, summary, steps[{title, note, tasks[{id, critical}]}], updatedAt}`. Re-curate it when a step lands or the path changes.

## Changing the board (ArtifactData tool, `url` above)

1. **Read before you write.** `list` or `get` gives each document's `version`. With `out_dir`, the saved files hold
   only the data; take versions from the tool's result.
2. **Pin every write** with `if_version`. An update merges top-level fields; arrays are replaced whole, so send the
   whole `history` or `questions` with your entry appended. Several documents go in one `batch` of at most 50, all
   or nothing.
3. **Times come from `date -u +%Y-%m-%dT%H:%M:%SZ`.** Never write a made-up time.
4. **When a thread starts on a task**, update its `threads` doc with the real session id, and the task's
   `stage`, `thread` and `history` in the same turn. A task reaches `done` only when merged with its check green.
5. **New slices** in `milestones.md` get a task doc in the same change. Mark `waiting: "aaron"` only for his
   decisions and sign-ins.
6. Write no key, connection string or person's email into any document.

## Saving the data into the repo

1. Run ArtifactData `list` four times (`tasks`, `threads`, `lanes` and `meta`), each with `query.limit` 1000 and the same `out_dir`.
2. Fold the export into `data/`:
   ```bash
   python3 -I .agents/skills/kanban/scripts/snapshot.py <out_dir>
   ```
3. Rewrite `STATE.md` from the data.
4. Commit both.

## Rebuilding the board

1. **Publish the page.** Call the Artifact tool with `file_path` set to `template/index.html` and
   `capabilities: {db: {}, user: {}}`. Pass `url` to update the live board; leave it out for a new one, which also
   needs `icon: "board"`. The page needs nothing else: no libraries and no other files. It renders an empty board
   until the database has rows.
2. **Seed a new board's database:**
   ```bash
   python3 -I .agents/skills/kanban/scripts/seed.py <out_dir>
   ```
   Then pass each `batch-<n>.json` as `writes` to ArtifactData `batch` on the new url. The writes are unpinned
   `set`s, so they only create.
3. **Rules the page keeps.** Each card is a `<button>`. The thread chip inside it is a `<span data-thread>`, never a
   nested button, because nested buttons split the card in two. Colours are tokens with a dark theme. The question
   forms and the stage form write through `db.update`. A reader who can't write sees "You can view this board but
   not change it."
4. **Check it.** The browser pane isn't signed in to claude.ai, so load `template/index.html` in a local harness
   that stubs `window.claude.use("db")` with `data/`. Never ship a page you haven't looked at.
