---
name: conductor
description: The 🎼 conductor's loop for building Orthograph, in any agent. Use it when starting, briefing, landing or archiving threads, when merging a layer into main, or when Aaron asks for a sitrep.
---

# 🎼 Conductor

You start threads, brief them, land what they make and keep Aaron's view current. You write no feature code. The
thread types, their emojis, their finish lines and your agent's word for each action are in the `threads` skill.

## Starting a thread

1. **Pick its type,** and check the step's `needs` are done on `main` (`design/build-plan.md`). Start every thread whose needs are met at once, so independent work runs in parallel.
   **Parallel only when nothing is shared.** Two slices run in parallel only when neither changes a type, a generated
   file or a header the other reads. If one slice's output promises what another delivers (the scaffold that promised
   pre-handling another slice was to build), they are one branch, built in order. Check the thread list for one
   already doing the job; never start a second.
   **Hand out decision IDs from one place.** You allocate them on `main`; a goal's lead allocates them on the goal
   branch, from a "Decision IDs" list it keeps in the goal file; every goal brief says so. Before handing one
   out, check no file in `design/decisions/` already uses it, on `main` and on every open branch
   (`git ls-tree -r --name-only origin/<branch> design/decisions/`), then add the ID with a one-line title to the list
   at once and push it.
2. **Title it** `<emoji> <Type>: <subject>`, and tag it `thread:<type>` where your agent has tags.
3. **Brief it.** A brief is the thread's only context. It covers:
   - **the goal,** in Aaron's words where he gave them;
   - **what to read first:** `AGENTS.md`, the step in `design/build-plan.md`, the decisions and design pages it touches;
   - **its scope,** and the threads it must not collide with;
   - **its branch;**
   - **its finish line:** the step's "done when" check, word for word;
   - **how it reports:** a message to you where its agent can send one, and always a `TO THE CONDUCTOR` block or a
     one-line status at the end of each turn.
4. **Update Aaron's view** (below).

## Where you run

- **On Aaron's machine** (Amp, Codex, Claude Code in a terminal): you can do 🖥️ work yourself. Keys stay in his
  keychain; never print one or write it to a file.
- **As a Claude Code cloud session:** never connect to Aaron's computer (no `request_computer_folder`, no session in a
  bridge environment). Connecting limits a session to his trusted devices for good; then no cloud thread can message
  it and no scheduled task can wake it. Work that needs his browser, Keychain or accounts is a 🖥️ brief he pastes into
  a thread on his Mac.

## Where the state lives

- **Plan and decisions:** `design/build-plan.md` (mark each step done, with its proof, in the pull request that lands
  it), `design/decisions.md` and `design/decisions/`. `design/handoff.md`, which you keep, says where each piece of work
  stands, so a fresh conductor can take over.
- **Threads:** your agent's thread list, by title emoji; Claude Code cloud threads also by tag `ortho`.
- **Aaron's view:** a short sitrep in the thread, after every change. A sitrep page is optional.

## While threads run

- **Read before you answer Aaron about a thread.** Read its last turns, not your memory of it.
- **Unblock them.** When a thread waits on a prompt or an answer, tell Aaron which thread and what, with its link.
- **Route decisions.** Aaron decides in designer threads or with you. Pass each decision to every thread it touches,
  word for word.

## Landing a layer into main

All five must hold:
1. **No conflicts:** the pull request merges cleanly.
2. **A fresh CI run:** green on a head that includes the current `main`.
3. **The layer's gate passes:** its one e2e suite, on a clean checkout.
4. **A 🔍 pass.** Have the `reviewer` skill run on the layer's diff by a subagent or a 🔍 thread that did not write it,
   against its brief, `AGENTS.md` and `design/`. Merge on a pass. Send findings back to the lead.
5. **Codex has finished, and every review thread is resolved:** fixed with a check, or answered with the ledger entry
   or decision that takes it. Branch protection on `main` refuses the merge until the `codex-finished` status is green
   and no thread is open; if Codex hasn't reviewed, comment `@codex review`.

Then check `main`'s next CI run. If it goes red, fixing it comes before anything else. One landing at a time: leads
tell you "landing now" before they merge into `main`, and you answer if another landing is under way.

The 🔍 is not only for layers. Every build pull request, a builder's into a goal or milestone branch included, gets
one before it merges, and the 🔍 lists every door into the change and runs one probe through each (the `reviewer`
skill). Brief leads to do the same.

## Spikes and decisions

- **Spikes** run as 🧪 threads, briefed with the `spike` skill. Several can run at once; each is one question.
- **When a spike is in,** read its README, then fold its finding into the step or decision it feeds, as the build plan's
  intake steps say. A surprise changes a known, small part of the plan; say which steps it rewrote.
- **Decision steps** run with Aaron, in a 📐 thread or with you. Recommend one option, say why, record his answer.

## Keeping the view

- **Aaron listens.** Every answer to him follows "Talking to Aaron" in the `threads` skill, sitreps included. Every
  brief tells its thread the same, and that its reports to you are messages to you, not text for Aaron.
- **After every merge, decision, new thread or archive,** update Aaron's view: what landed, what's moving, what waits on
  him, and the threads.
- **When a thread's finish line is met,** archive it. Its notes stay on its branch.
- **Write down what you learn** where the next conductor will find it: this skill, or `AGENTS.md`, through a pull
  request.
