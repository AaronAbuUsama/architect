---
name: threads
description: Thread types for Orthograph's agent threads, each with its emoji, job and finish line, whatever agent runs it (Amp, Claude Code, Codex). Read it when you start a thread, or when your brief names your type ("you are a 🔨 builder thread").
---

# Thread types

A **thread** is one agent conversation working on Orthograph: an Amp thread, a Claude Code session, a Codex
session. Every thread is one **thread type**. Its title starts with the type's emoji, so Aaron can see what each one is
at a glance: `<emoji> <Type>: <subject>`, for example `🔨 Builder: L1.13 generators v0`. Where your
agent has tags or labels, tag it `thread:<type>`, in your agent's form (the table at the end).

The conductor starts threads, briefs them and lands what they make. Report to it when you finish, when you're blocked,
and when a decision is needed: message it if your agent can reach the conductor's thread, and in every case end each
turn with a `TO THE CONDUCTOR` block or a one-line status, because the conductor also reads threads directly.

`AGENTS.md` binds every type. That covers its standing rules, the gate, and "Lanes, leads and the conductor".

| Emoji | Type | Job | Finished when |
|---|---|---|---|
| 🎼 | Conductor | Starts, briefs, lands and archives threads; keeps `main` green; routes Aaron's decisions; keeps his view current | Never; a fresh conductor can take over from `design/`, the build plan's step states and the threads |
| 🧭 | Lead | Runs one layer on `layer/<n>`: has authors and builders do its steps, merges their pull requests into the layer, lands the layer on `main` when its gate passes | Every step of the layer is done on `main`, with its gate passing |
| 🧪 | Spike | Answers one question in throwaway code under `spikes/<name>/` (the `spike` skill) | Its README is merged into `main`, with the decision it supports |
| ✍️ | Author | Writes the journeys and checks for a step from its declarations, before any build; they fail on empty handlers | The journeys fail on empty handlers, in a pull request into the layer |
| 🔨 | Builder | Does one step: one branch, one pull request into the layer (or into `main` for L1.01) | The pull request is merged with CI green and its "done when" check passing; never touches journeys or the evals |
| 🔍 | Reviewer | Reads a diff against its brief, `AGENTS.md` and `design/`, independent of whoever wrote it (the `reviewer` skill) | A verdict: pass, or the numbered findings that block it |
| 📐 | Designer | Works a decision step through with Aaron: options, a recommendation each, his decision recorded | The decision is written in `design/decisions/<id>.md` with its date and evidence |
| 🖥️ | Local | Runs on Aaron's machine for what only it can reach: his browser, his keychain, his accounts | The task is done, and nothing secret was printed or written outside the keychain |
| 📓 | Scribe | Watches how the project is built, without building it: logs each process failure, near miss and win in `design/process/log.md` with its evidence, groups them in `patterns.md`, proposes skill and workflow changes in `proposals.md`, and tells the conductor when three entries share a pattern with no fix | Never while threads run; each pass ends with its log, patterns and proposals merged into `main` |

## Rules every type keeps

- **Land on a fresh base.** Merge a pull request only when it has no conflicts and CI ran on a head that includes the
  current target branch. Two pull requests that were each green can break the branch together.
- **A layer into `main` needs a 🔍 pass** as well as CI and its gate.
- **Secrets stay out of view.** Never print a key or connection string, or write one to a file or repository.
- **Use the design's words:** the names in `design/decisions.md` and the docs' conventions page.

## Talking to Aaron: he listens, he doesn't read

Unless Aaron says otherwise, he talks to you through speech-to-text and listens to your answers through text-to-speech
(Aaron, 15 November 2026). So:

- **Read his words for meaning, not spelling.** Speech-to-text mishears names, numbers and code words; take the likely
  meaning, and ask only when two meanings would lead to different work.
- **Write to him for the ear.** Short, plain sentences, in the order he needs them: the answer first, then why, then
  what waits on him. No tables, no code blocks and no symbols that read badly aloud (arrows, slashes, asterisks,
  emoji in the middle of a sentence). Say what a pull request does rather than reading out its number; put numbers,
  links, branch names and commands at the end, after the spoken part, for when he looks at the screen.
- **Numbered lists** are fine, kept short, each item a full sentence. Decisions are offered as a few numbered options
  with your recommendation said first.
- **Messages to the conductor or another thread** are not for Aaron's ears. Keep them exact and complete, with numbers,
  branches and links: send them as messages to that thread, never through Aaron.

## Threads in your agent

The kit names actions, not tools. Use your agent's own:

| Action | Claude Code (cloud) | Amp | Codex |
|---|---|---|---|
| Start a thread | `create_session` | `create_thread`: an orb by default, or a live `amp` runner on Aaron's Mac when one is connected | a new session: `codex exec` (or `codex` and `/new`) on the machine, `codex cloud exec --env <env>` in the cloud |
| Run a short side task | a subagent (`Agent`) | a subagent (`Task`) | a subagent: ask Codex to spawn one |
| Message a thread | `send_message` | `send_thread_message`; a thread it starts reports back the same way when its brief asks it to | `codex queue --thread <session> --message "…" --resume`, for a session on the same machine; none for a cloud chat |
| Read a thread | `list_events` | `read_thread` for its whole history, `get_thread_status` for its live state and latest messages | its transcript under `~/.codex/sessions/`, or `/export` inside it; `codex cloud list` for cloud chats |
| Archive a thread | `archive_session` | `update_thread` with `archived: true` (`false` restores it); the threads it started stay active | `codex archive <session>` (`codex unarchive` restores it); the subagent sessions it spawned go with it |
| Tag a thread | the tag `thread:<type>` | the label `thread-<type>`: labels take only letters, digits and hyphens | none: the title carries the type (`/rename`) |
| A thread's link | `https://claude.ai/code/<session id>` | a Markdown link, the title as its text: `[<title>](https://ampcode.com/threads/T-…)` | a cloud chat's `url` from `codex cloud list`; a local session has none, so give its session ID |

Where a cell is wrong for your agent, fix it in a pull request: this table is the one place it is written.
