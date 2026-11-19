# How we build: the process log

Orthograph is built almost entirely by agent threads. This folder records how that building goes: where the process
breaks, how we notice, how we recover, and what works. It is kept by the 📓 Scribe (the `threads` skill), who watches
and builds nothing.

The aim is reuse. Aaron, 19 November 2026: "we need to create a set of skills and workflows and so its important to
understand where things are breaking and how we recover." Every entry here is evidence for a skill, a check or a
workflow step that a later project can take without living through the same failure.

## The three files

- **`log.md`**: one entry per event, newest first. The raw record.
- **`patterns.md`**: the families the entries fall into. For each: its entries, what already covers it (a skill, a
  rule, a check), and the gap that's left.
- **`proposals.md`**: for each pattern with a gap, a concrete change (a new skill, a diff to a skill in
  `.agents/skills/`, a check, a workflow step), ranked by how often the pattern hit and what it cost. Proposals are
  applied by the conductor or the thread that owns the skill, never by the Scribe.

## Writing an entry

An entry is an event that taught us something about the process, not about the code. A plain code bug caught by its
own test is not an entry; the same bug passing a 🔍 review and reaching a merged branch is.

```md
### 2026-11-19 · <what happened, in plain words, no internal IDs>
- **Kind:** failure, near miss, or win.
- **What happened:** two to four sentences, concrete.
- **Evidence:** at least one link: a pull request, a review comment, a commit, a CI run, a session and its time.
- **Cost:** time, rework, runner hours, Aaron's trust. Measured where it can be.
- **Found by:** CI, Codex, a 🔍 reviewer, a builder, an author, a lead, the conductor, or Aaron.
- **Recovery:** what was done about it at the time.
- **What changed:** the rule, skill, check or decision that changed because of it, linked, or "nothing yet".
- **Pattern:** the family in `patterns.md` it belongs to.
```

The rules:

1. **No entry without evidence.** If the only source is someone's memory, find the link or leave it out.
2. **Plain words first.** The title says what happened as Aaron would say it. Internal IDs (a snag, a ledger row, a
   pull request number) go in the evidence line, or in brackets after the plain words.
3. **A failure** cost something real. **A near miss** would have, and was caught in time. **A win** is a practice that
   caught something early or saved rework, worth keeping on purpose.
4. **Newest first.** Append at the top of `log.md`. Never rewrite an old entry's facts; add a dated line under it when
   something later changes (a fix lands, a proposal is applied).
5. **Update `patterns.md` in the same change.** When an entry joins a pattern, add it there. When a fix lands, mark the
   pattern covered and link the fix.
6. **Raise it.** When three or more entries share a pattern with no fix, the Scribe tells the conductor straight away,
   in a message, with the entries and a proposal.

## Where the evidence lives

- Pull requests, review threads and Codex findings: `gh pr view`, `gh api repos/AaronAbuUsama/architect/pulls/<n>/comments`.
- CI runs: `gh run list`, `gh run view`.
- Session transcripts: the conductor's thread list (`list_sessions`, `list_events`, `search_session_transcripts` in
  Claude Code). A session link is its id and the time of the message.
- The written record: `design/ledger.md`, `design/decisions/`, `design/handoff.md`, `design/evidence/`, and the
  `kanban` skill's `STATE.md`.
