# K33: the work lives on GitHub, natively

**Decided 21 November 2026 by Aaron**, to the 📐 designer thread: make K32's practice "a bit more GitHub native …
with issue types and labels … and also have different milestones for different goals", with "a little bit of a
foundation slice" that lands it with the new templates and skills, seeded "with the missions that we currently have",
and with front matter, so anyone can tell "what agent is working on what, and what harness, and what model". It builds
on K32 (goals coordinate themselves, through git and GitHub) and changes one thing in it: milestones are per goal, not
per release.

## The problem

K32 moved coordination off chat and onto git and GitHub, but by convention in prose. GitHub itself held almost
nothing of the shape, as it stood on 21 November 2026:

```text
$ gh api repos/AaronAbuUsama/architect/milestones --jq '.[].title'
Preview
Beta
1.0                                 # one milestone per release, so no page shows one goal's work
$ gh api graphql … issueTypes       # Task, Bug, Feature: the only types; custom types need an organization
$ ls .github/ISSUE_TEMPLATE         # none: an issue is free text, so nothing can be filtered by what it is
$ grep -c '^| `' design/ledger.md   # 731 rows of open problems, in a file nothing on GitHub can see
```

- **A goal's work is nowhere in one place.** Its pull requests carry a `goal-<n>` label and a release milestone, its
  slices live only in its brief's tables, and its snags in a Markdown file.
- **Nobody can tell who runs what.** Every agent uses one GitHub account; the harness and model of a goal's lead were
  written nowhere, and the claude.ai kanban that tracked threads can't be reached from Amp or Codex.
- **Every kind of work looked the same.** A snag, an ask between goals and a slice were all free-text issues.

## What is decided

1. **A milestone per goal** (Aaron). `Goal <n>: <title>`, its description naming the brief and the done check. Every
   issue and pull request of a goal carries it, so the milestone page is the goal's progress. GitHub allows one
   milestone per issue, so **the release becomes a label**: `release:preview`, `release:beta`, `release:1.0` (K28's
   three). The `goal-<n>` labels K32 made stay, mirroring the milestone, so lists of pull requests filter by goal too.
2. **Six kinds of issue, each a native type, a `kind:` label and a form** (`.github/ISSUE_TEMPLATE/`, blank issues
   off):

   | Kind | Type | What | Milestone |
   |---|---|---|---|
   | `kind:goal` | Feature | one per goal, the parent of its slices | its goal |
   | `kind:slice` | Task | one per slice, a sub-issue of the goal issue, closed by the pull request that lands it | its goal |
   | `kind:snag` | Bug | something a goal hit and couldn't fix in its own paths: its own snags only | its goal |
   | `kind:ask` | Task | one goal asking another to act | the goal that must act |
   | `kind:decision` | Task | a call waiting to be made, closed by the pull request that records it | the goal that decides |
   | `kind:gap` | Task | a ledger row picked up as work, titled with its ledger id | the goal that closes it |

   Custom issue types need a GitHub organization, and this repository belongs to a person, so the kind is a label on
   top of the nearest native type. If the repository moves to an organization, each kind becomes its own type and the
   labels go.
3. **Slices are sub-issues.** The goal issue's sub-issue list is the brief's slice list, so GitHub shows a goal's
   progress as a bar, and a pull request closes its slice with `Closes #<n>`.
4. **Who works on what is written in three places,** since one account does everything:
   - the brief's front matter, `lead: { harness, model, since }` and `status:`, set by the lead when it starts and
     mirrored into the goal issue;
   - every pull request's labels, `role:<role>` and `harness:<harness>` (`harness:claude`, `harness:amp`,
     `harness:codex`), and the template's "Harness and model" line; a model is never a label, since models change
     weekly;
   - a comment on the slice issue when an agent takes it: "Taking this: <harness>, <model>, <role>".
   None of this is an attribution line in a commit; it is data on the work.
5. **Front matter on every goal brief.** A small YAML subset (the parser in `tools/github/frontmatter.mjs` refuses
   anything else): `goal`, `title`, `milestone`, `release`, `branch`, `base`, `status`, `lead`, `done_check`, `owns`,
   `slices`. The brief stays the whole context (K32); the front matter is the part a machine reads.
6. **The sync mirrors the briefs onto GitHub.** `tools/github/sync.mjs`, dry run by default, `--apply` to write: the
   labels, a milestone per goal, the goal issue and a sub-issue per slice, keeping the goal issue's body equal to the
   front matter. It finds its issues by a marker in their body, never by title, never deletes, and running it twice
   changes nothing (its tests, `tools/github/sync.test.mjs`). `--migrate` moves open issues and pull requests from
   `goal-<n>` labels and release milestones to goal milestones and release labels, once.
7. **Snags are issues from now.** A goal's new snags are Snag issues in its milestone, so they can be filtered, linked
   and closed by the pull request that fixes them. The `<nn>-snags.md` files stay as the record of what came before.
8. **The ledger stays one file.** `design/ledger.md` is cited by id across the design. A row becomes a Gap issue only
   when someone picks it up or a release needs it; the row gains the issue's link in the pull request that closes it.
   No bulk import: 518 open rows would bury every goal's own issues.
9. **Review comments are marked** `blocker:`, `nit:` or `question:` (the `github` skill). A nit never blocks but is
   never left open: the author answers "taken" or "left: <why>" and resolves it, as branch protection already
   requires of every thread.
10. **A pull request template** (`.github/pull_request_template.md`): the issue it closes, goal and slice, role,
    harness and model, the check and what it printed; what it changes, what it touches, what is not done or not
    verified.
11. **A `github` skill** (`.agents/skills/github/`) says all of this for every agent, in any harness.

## Seeded, 21 November 2026

The first run of the sync (`--migrate --apply`) made, from the briefs on `main` and on the goal branches:

- milestones `Goal 3` to `Goal 7`, from `03-stage-1-hill-climbed.md` on `main`, `04-on-chain.md` on `goal/on-chain`,
  `05` and `06` in this change, and `07-safe-hats.md` on `goal/safe-hats`;
- a goal issue each, and for Goals 5 and 6 (the briefs with front matter) a sub-issue per slice;
- the labels in `tools/github/plan.mjs`;
- every open issue and pull request moved from its `goal-<n>` label and release milestone to its goal's milestone and
  release label.

Goals 3, 4 and 7 get their slices on GitHub when their leads add front matter to their briefs, as their next brief
edit (K32 already asks each to adopt it, #299 and #300).

## Not chosen

- **A GitHub Projects board now.** It would give a board with custom fields (harness, model) beside the milestones,
  but the token lacks the `project` scope (Aaron would run `gh auth refresh -s project`), and K32 found a second board
  beside the repository's own data no gain. Milestones, sub-issues and labels give the view today; a board can be laid
  over them later, read from the same labels.
- **Milestones per release** (K32's first form): a goal's work would be split across three pages and mixed with every
  other goal's.
- **Assignees per agent:** every agent is one GitHub account.
- **The ledger as 731 issues.**

## Reversible

Everything on GitHub is made by the sync from files, finds itself by a marker, and is never deleted by it. Labels and
milestones can be renamed or closed by hand; the briefs keep the truth either way.

## Supersedes

From K32 (#298), which merged as written; its words gain a "Superseded by K33" note:

- design/decisions/K32-goals-coordinate-themselves.md: "**A milestone per release** (K28)" → "**A milestone per goal** (K33), and a `release:<name>` label per release"

From the live docs that still said release milestones and snag files:

- AGENTS.md: "a `goal-<n>` label, the release milestones, and issues for asks between goals" → "its goal's milestone and `goal-<n>` label, and Snag and Ask issues in that milestone"
- .agents/skills/conductor/SKILL.md: "its snag file, its `goal-<n>` label and issues" → "its milestone and `goal-<n>` label, and its Snag and Ask issues"
- .agents/skills/conductor/SKILL.md: "its snag file, the `goal-<n>` label and the release milestones on GitHub" → "its milestone on GitHub, with its Snag and Ask issues"
- .agents/skills/threads/SKILL.md: "its snag file; a `goal-<n>` label on its pull requests and issues; and an issue labelled for another goal" → "Snag issues in its milestone; its milestone and `goal-<n>` label on its pull requests and issues; and an Ask issue in another goal's milestone"

From #285:

- design/milestones.md: "Goal 3's lead has agreed the freeze on a `goal-3` issue" → "Goal 3's lead has agreed the freeze on an Ask issue in Goal 3's milestone"
