# AGENTS.md

`CLAUDE.md` points here. Every agent (Claude, Codex, Amp) reads the same rules.

## What this repository is

Architect, the framework. Its design is in `design/`: `decisions.md` (what is decided and what is proposed),
`build-plan.md` (the steps, layer by layer, each with what it needs and the check that proves it), `packages.md`,
`spikes.md` and `spikes/`, and the design docs in `design/docs/index.html`. When code and design disagree, the design
wins until a decision changes it; a decision changes only with Aaron's yes for anything marked decided.

## How work flows

- **Layers.** Architect is built in five layers (declare and call; prove and ship; reach out; on chain; time). Nothing
  in a layer starts until the previous layer's gate passes on `main`. Ideas for later layers go in `design/later.md`,
  never into code.
- **Steps.** Each step of `build-plan.md` is one thread, one branch and one pull request, small enough for one session,
  ending green with its "done when" check. A layer is built on `layer/<n>`, cut from `main` by that layer's lead; step
  pull requests go into `layer/<n>`; the layer reaches `main` by one pull request, merged when CI is green, its gate
  passes and a 🔍 reviewer passed it.
- **Spikes** answer one question in throwaway code under `spikes/<name>/`, on a `spike/<name>` branch. Each ends with
  a README (question, tried, found, the decision it supports, open risks) and is merged into `main` for the record.
  Spike code is never imported by packages.
- **Decisions** are made just in time, in the decision step placed before the first step that needs it, and recorded
  in `design/decisions/<id>.md` with the evidence. Don't reopen one without new evidence.
- **Journeys and checks come first.** A different agent from the builder writes an operation's journeys and checks,
  and they fail on empty handlers before the builder starts. A builder never edits journeys, the evals or the runner's
  generic checks.
- **Merge your own pull requests when CI is green.** Push on until actually blocked.

## The code's own rules (enforced by lint and check as soon as they exist)

- Effect everywhere; no `async`, `await`, `try`, `throw`, `Date.now`, `new Date()`, `setTimeout` or plain
  `Effect.sleep` outside named entry files. Every wait goes through `Timers`; all handler, workflow and keeper work is
  counted work.
- Names come from paths and exported identifiers; a declared name is never written as a string outside `generated/`.
- Generated files start with `// Generated from the blueprint. Do not edit.` and are never edited. Scaffolds start
  with `// Scaffolded from <path>. Yours from now on.`
- Package rules (Nx module boundaries): `blueprint` depends only on Effect; generated code imports only the target's
  runtime, `blueprint`, the host and project code; `compiler` and `generators` never run in production.
- Pin dependency versions exactly, and use versions published at least two weeks before you add them.

## Standing rules from Aaron

- Ask Aaron only about money beyond the cap, credentials, production, or a decision nothing covers, and batch the
  questions.
- Spend at most $10 a day on cloud resources, across everything. Layer one needs no cloud at all.
- Every world, stage and site you make is destroyed; nothing is left running. Touch only your own resources.
- Never print a key or connection string, or write one to a file or a commit. Never create a cloud credential without
  Aaron's written yes.
- Keep people's emails and personal details private.
- A Claude Code cloud session never connects to Aaron's computer: a session that does is limited to his trusted devices
  for good, and no cloud thread or scheduled task can reach it again.
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".

## Threads

Every thread is one type, titled with its emoji; the kit is in `.agents/skills/`: `threads` (the types and each agent's
word for starting, messaging, reading and archiving a thread), `conductor` (the loop), `spike` (running a spike),
`reviewer` (the 🔍 review) and `hashtags` (Aaron's `#shortcuts`). `.claude/skills` and `.claude/agents/reviewer.md`
are links to it; edit the kit only in `.agents/skills/`.
