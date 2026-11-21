---
name: github
description: How Orthograph's work lives on GitHub (K33), for every agent in any harness. A milestone per goal; issue kinds (goal, slice, snag, ask, decision, gap) as native types with kind labels and forms; release, role and harness labels; the pull request template; review nits; the ledger; and tools/github/sync.mjs, which mirrors the goal briefs' front matter onto GitHub. Read it before you open an issue or a pull request, start or finish a slice, log a snag, ask another goal for something, or pick up a ledger row.
---

# Orthograph on GitHub

The files are the truth and GitHub is where the work is seen ([K33](../../../design/decisions/K33-github-native.md),
on top of [K32](../../../design/decisions/K32-goals-coordinate-themselves.md)). Every agent here, whatever its harness,
works under one GitHub account, so who did what is said by labels and the template, never by an assignee.

## The map

| Thing | On GitHub | Made by |
|---|---|---|
| A goal | a **milestone** `Goal <n>: <title>`, and a **goal issue** (type Feature, `kind:goal`) | `tools/github/sync.mjs`, from the brief's front matter |
| A slice | a **sub-issue** of the goal issue (type Task, `kind:slice`) | the sync, from the brief's `slices:` |
| A snag (your goal's own) | an issue, type Bug, `kind:snag`, your milestone | you, with the Snag form |
| An ask to another goal | an issue, type Task, `kind:ask`, **the acting goal's** milestone | you, with the Ask form |
| A decision to make | an issue, type Task, `kind:decision` | you, with the Decision form |
| A ledger row being worked | an issue, type Task, `kind:gap`, titled with its ledger id | you, with the Gap form |
| A release (K28) | a label: `release:preview`, `release:beta`, `release:1.0` | the sync |
| Who did it | labels `role:<role>` and `harness:<harness>`, and the template's lines | you, on every pull request |
| Blocked | the label `blocked`, and `needs-aaron` when only Aaron can unblock it | you |

GitHub allows one milestone per issue, so the milestone says which goal, and the release is a label.

## A goal's brief

A brief (`design/goals/<nn>-<name>.md`) opens with front matter, which the sync reads:

```yaml
---
goal: 6
title: the new portal, on our own components and the app's map
milestone: "Goal 6: the new portal"
release: beta                 # preview | beta | 1.0
branch: goal/portal
base: goal/stage-1
status: running               # ready | running | landing | done | parked
lead:
  harness: amp                # claude-code | amp | codex
  model: claude-opus-5-5      # the model id the lead runs on
  since: 2026-11-22
done_check: nx run e2e:portal-next
owns:
  - packages/theme/
slices:
  - "1 · The theme"
---
```

The lead sets `lead:` and `status:` when it starts and whenever they change, in the pull request that changes them;
that is how anyone can see which harness and model runs which goal. Only the parser's subset is allowed: `key: value`,
`key: [a, b]`, a block list of `- item`, and one level of nested map. The sync refuses anything else.

## The sync

```bash
node tools/github/sync.mjs                 # what it would do (a dry run, the default)
node tools/github/sync.mjs --apply         # do it
node tools/github/sync.mjs --brief origin/goal/on-chain:design/goals/04-on-chain.md   # a brief on another branch
node --test tools/github/sync.test.mjs     # its tests
```

It makes the labels, a milestone per goal, the goal issue and a sub-issue per slice, and keeps the goal issue's body
the same as the brief's front matter. It finds its issues by a marker in their body (`<!-- orthograph:goal=6 -->`),
never by title, and never deletes anything. Run it after a pull request that adds a goal or changes a brief's front
matter merges. A brief with no front matter still gets its milestone and goal issue, from its file name and heading.

## Working a slice

1. At the start: merge your base in; read the open issues in your milestone with `kind:ask` (asks to you) and answer
   or schedule each.
2. Comment on the slice issue: "Taking this: <harness>, <model>, <role>." Add your `harness:` label to it.
3. Open the pull request from the template. `Closes #<slice>`, your milestone, your `role:`, `harness:` and `release:`
   labels. Fill every line; "none" is an answer.
4. When it merges, rewrite the brief's "Where it stands" in the same pull request. The slice issue closes itself.

```bash
gh pr create --base goal/portal --milestone "Goal 6: the new portal" \
  --label role:builder --label harness:amp --label release:beta --body-file pr.md
gh issue list --milestone "Goal 6: the new portal" --label kind:ask --state open
```

## Snags, asks and the ledger

- **Your own snag** is a Snag issue in your milestone. The old `<nn>-snags.md` files stay as the record of what came
  before; new snags are issues, so they can be filtered, linked and closed by the pull request that fixes them.
- **An ask** goes in the milestone of the goal that must act, with the Ask form: what you need, what done looks like,
  what waits on it. You never edit its paths to get around it; its lead closes the ask with a pull request.
- **The ledger** (`design/ledger.md`) stays one file: hundreds of rows, cited by id. A row becomes a Gap issue only
  when someone picks it up or a release needs it; the issue's title starts with its id, and the row gets the issue's
  link in the pull request that closes it.

## Reviews and nits

A 🔍 reviewer (the `reviewer` skill) marks each review comment:

- `blocker:` must be fixed before the merge. Only the reviewer's next pass resolves it.
- `nit:` doesn't block. The author answers "taken" (and fixes it) or "left: <why>", then resolves the thread.
- `question:` needs an answer, not necessarily a change.

Every thread must be resolved before a merge (branch protection), so a nit is never left open, only answered.

## Decisions

A goal names its own calls by area and a slug (`WEB-piece-state`, `MAP-route-params`), checks no file in
`design/decisions/` on any branch starts with the name, and lists it in its brief. A call that crosses goals takes a
lettered id from the conductor's list in `design/handoff.md`. A Decision issue is optional: open one when the call
waits on someone, close it with the pull request that writes the file.
