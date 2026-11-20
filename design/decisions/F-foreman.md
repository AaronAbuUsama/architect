# F-foreman: Foreman, version zero

Proposed 20 November 2026, as a draft for Aaron. Nothing here is built. The architecture is the building agent's to
decide (`AGENTS.md`, "Who decides"); the five forks at the end are the ones where the goal itself is Aaron's.

Read first, and leaned on throughout: the working lessons (`design/process/lessons.md`), the model draft on draft PR 185
(`design/model/README.md` on branch `claude/orthograph-model-cf3dca`, cited below as "the model draft"), the agent
harness (`H1-agent-harness.md`), agent runs and benchmarks (`H2-agent-runs-and-benchmarks.md`), the factory
(`K10-factory.md`), the work board (`K11-work-board.md`), the portal (`design/portal.md`) and the frame's skills
(`design/frame/skills.md`).

Words are the canon's (`docs/canon/outline.md`): blueprint, thing, operation, journey, refusal, feature plugin, mount,
prove, the portal. Two working words are this record's own: **Foreman** (the agent) and **the person** (whoever builds
an app with it; for Capxul, Aaron).

## 1. What Foreman is

Foreman is the agent a person builds an app with on Orthograph. The person brings an idea and makes the decisions.
Foreman does the rest: it turns the idea into a blueprint, gets journeys written before anything is built, runs builder
agents until the journeys are green, says plainly where things stand, and, when a piece has proved itself inside the app,
extracts it into a plugin.

It holds its own state, apart from whichever agent runs it. Version zero runs inside Claude Code or Codex as a plugin:
skills, subagents and hooks, with one way of working. Its state is plain files in the person's repository. Later the same
state moves into a durable actor through the agent harness (H1), and Foreman becomes an agent in the portal. Version
zero builds none of that machinery. It is mostly the working practices, written down so an agent follows them.

**What it knows, and where that knowledge lives:**

| It knows | From |
|---|---|
| where things stand and what is missing | `ortho check`, `ortho impact`, the last prove, open pull requests and CI, read on every wake (section 5) |
| what it needs from the person, and when to ask | its own asks list (section 4), and the rule in section 7 |
| when to start building | a slice is ready when its journeys fail on empty handlers and have been shown satisfiable (lessons 1 and 2) |
| how to prove something | `ortho prove`, journeys by a different agent, a 🔍 that probes every door (lessons 3 to 6) |
| when and how to extract | the extraction loop in the model draft, section 3, gated on a second real user (question 4 of the model draft) |
| Orthograph's mental model, to explain it | the model draft, sections 1 and 2, shipped with the plugin as its `explain` skill's reference |

**What it is not.**

- **Not the conductor.** The conductor builds Orthograph: many threads, milestones, `main`, one shared Mac. Foreman builds
  one app on Orthograph, for one person. Section 2 says what they share.
- **Not the factory.** The factory (K10) is the building agents and their sandboxes, as packages. Foreman drives builder
  agents; in version zero those are Claude Code subagents or sessions, and later the factory's roster.
- **Not the agent kit.** The agent kit (`design/frame/skills.md`, M3.12) is twenty-three skills, generated per app,
  for one job each. Foreman is the persona and the loops that use them. Where Foreman's version-zero skill does the same
  job as a kit skill, it takes the kit's name, so when the kit lands it replaces Foreman's hand-written one (section 3).
- **Not the portal's chat assistant.** That agent uses the running app on a person's behalf (K10 section 1). Foreman
  builds the app.

## 2. Foreman and the conductor

The conductor skill (`.agents/skills/conductor/SKILL.md`) starts threads, briefs them, lands their work and keeps
Aaron's view. Foreman does the same jobs at a smaller scale, for a different person, in a different repository:

| | Conductor | Foreman |
|---|---|---|
| Builds | Orthograph, the framework | an app on Orthograph |
| For | Aaron, as Orthograph's owner | the person who owns the app |
| Runs | many threads at once, across milestones | one loop at a time, a few subagents |
| State | `design/handoff.md`, the kanban skill's board, `STATE.md` | `foreman/` in the app's repository (section 4) |
| Gate | milestone gates on `main` | each slice's journeys green, with a 🔍 pass |

**Do they share a core?** They should share the role skills, not the persona. The lessons show the same practices hold
both ways: 21 of 24 are marked "both" (`design/process/lessons.md`, "At a glance"). The roles that carry those practices
(author, reviewer) are the same jobs whether the app is Orthograph or Capxul. The persona differs: the conductor talks
to Aaron about milestones and threads; Foreman talks to a person about their idea. Question 1 at the end puts this to
Aaron, with the sketch.

## 3. Its parts, as a plugin

One plugin, shipped from the Orthograph repository, installed into the person's agent. Claude Code reads it as a plugin;
Codex reads the same skill folders from `.agents/skills/`, the way this repository's skills already serve every agent
(`AGENTS.md`, "Threads").

```text
plugins/foreman/
  .claude-plugin/plugin.json      name, version, description
  skills/
    foreman/SKILL.md              the persona and the wake routine; loaded first, every session
    where-are-we/SKILL.md         read the facts, rewrite foreman/now.md, say it aloud
    ideate/SKILL.md               the ideation loop
    climb/SKILL.md                the dev loop
    extract/SKILL.md              the extraction loop
    ask/SKILL.md                  putting a decision to the person: batched, for the ear, recommendation first
    explain/SKILL.md              explaining Orthograph's model; reference: the model draft's sections 1 and 2
  agents/
    journey-author.md             writes journeys from declarations, never handlers
    checks-author.md              makes journeys executable; the author skill's six proofs
    climber.md                    fills handlers until prove is green; never touches journeys
    framework-builder.md          fixes a gap in Orthograph itself, in Orthograph's repository, never the app's
    reviewer.md                   the 🔍: every door, one probe each; wrote none of what it reviews
  hooks/hooks.json                session start: wake; stop: is the state saved and pushed?
  reference/
    model.md                      the model draft's sections 1 and 2, pinned to the version shipped
    lessons.md                    design/process/lessons.md, pinned
```

### The skills

| Skill | Trigger | Does | Done when | Kit skill it becomes |
|---|---|---|---|---|
| `foreman` | every session start (the hook loads it) | sets the way of working (below), then runs `where-are-we` | the person has heard where things stand | none: the persona stays |
| `where-are-we` | waking; "where are we"; after any subagent finishes | section 5's wake routine | `foreman/now.md` is current and said aloud | `describe-this-app` (`design/frame/skills.md:92`) |
| `ideate` | a new idea, or "let's add …" | the ideation loop, below | a slice whose journeys fail on empty handlers and are shown satisfiable | `shape-an-idea` (`design/frame/skills.md:100`) |
| `climb` | a slice is ready | the dev loop, below | every journey in the slice green, the grid not worse, a 🔍 pass | the builder bundle (`design/frame/skills.md:275`) |
| `extract` | a piece has its second real user | the extraction loop, below | the app mounts the plugin with one file, and its copy is deleted | none yet (`ortho new feature` is M2.10) |
| `ask` | Foreman is blocked on the person | section 7's asking rules | the answer is a decision file | none |
| `explain` | "what is a …", "why does …" | explains from `reference/model.md` and this app's own files | the person can say it back | none |

### The subagents: the existing roles, reused

These are the roles this repository already runs, under the names Aaron's brief gives them. Each file is a role brief
that points at the skill holding its practice, so there is one copy of each practice (lesson 13).

| Subagent | Today's role | Practice it carries | May write | Never |
|---|---|---|---|---|
| journey author | ✍️ author, journeys half (`threads` skill) | proofs 1 to 3 of the `author` skill; journeys as stories the person reads back | `journeys/`, `blueprint/starting-worlds/` | `src/` |
| checks author | ✍️ author, checks half | proofs 4 to 6, the hostile pass (`.agents/skills/author/SKILL.md:24-38`) | journeys' executable steps | `src/` |
| climber | 🔨 builder, as Goal 3's climber | prove after every handler change; the tool writes the curve (lesson 22) | `src/`, one slice's handlers | journeys, evals, `generated/` |
| framework builder | 🔨 builder, in Orthograph's repository | a gap in Orthograph becomes a snag with a failing check, built there, never patched in the app | Orthograph's repository, on its own branch | the app |
| reviewer | 🔍 reviewer (`.agents/skills/reviewer/SKILL.md`) | every door, one probe each; unanswered findings block | nothing | any file |

The split between journey author and climber is the one rule Foreman never bends: whoever is judged never edits the
judge (lesson 5). In version zero, separate subagents with separate briefs hold it. In the person's repository there is
no `builder-paths` check yet; section 8 says what Foreman does about that.

### The workflows: the three loops

Each loop is the model draft's (section 3), with what Foreman adds in **bold**.

**The ideation loop: from an idea to a slice ready to build.**

1. Name the idea in one sentence, in the person's words.
2. **Read what exists.** In an existing codebase, read it before declaring anything; say what the blueprint will keep
   and what it will drop.
3. Declare the things and operations: `ortho add thing`, `ortho add operation`; the machine and rules where known.
   Unknowns are `Blueprint.todo("…")`, never guesses.
4. **Batch the open questions** (section 7) and ask them, each with a recommendation.
5. Journeys, written by the journey author as stories the person reads back. The person's yes is a decision file.
6. **Walk each journey with a throwaway handler** before calling the slice ready (lesson 2). A journey that can't be
   walked is a gap: in the blueprint (back to step 3), or in Orthograph (a framework snag, section 8).
7. The checks author makes them executable; `ortho prove --empty` is red on every behaviour step.

**The dev loop: from a ready slice to green.** Edit, `ortho generate`, `ortho check`, `ortho prove`, `ortho impact`
(model draft, section 3). Foreman runs the climber on it, and adds: **one slice at a time unless nothing is shared**
(lesson 9); **findings become failing checks first** (lesson 4); **a 🔍 before the merge** (lesson 6).

**The extraction loop: from app code to a plugin.** The model draft's eight steps, from "find the seam" to "delete the
copy". Foreman adds the trigger: **a piece is extracted at its second real user, never its first** (the model draft's
question 4), and the person says yes before anything is published.

### The persona, as working behaviour

The `foreman` skill's body is these rules, in this order. They are what Foreman does, not how it sounds.

1. **Start every session by saying where we are.** Three sentences: the idea and the loop, what moved since last time,
   what I need from you. Then detail only if asked (lessons 16 and 18).
2. **Drive.** End every turn with the next step already started, or with one batched ask. Never "let me know what
   you'd like to do".
3. **Plain words before labels.** No slice numbers, decision IDs or pull request numbers alone; say what each does.
4. **Check before you claim.** Anything said about the code or the app's state is read first-hand that turn
   (lesson 16). Status comes from runs, never from memory (lesson 22).
5. **Write for the ear.** Short sentences, answer first, numbers and links at the end (`.agents/skills/threads/SKILL.md:55-76`).
6. **Separate the judge from the judged.** Never write a handler and the journey that tests it in the same role.
7. **Push before you report.** Every change, including Foreman's own state, is committed and pushed (lesson 11).
8. **Ask only when blocked, and batch it** (`AGENTS.md`, "Standing rules"); otherwise decide, record why, and say so.

## 4. Its state, floor-first

### Version zero: files in the person's repository

```text
foreman/
  now.md              where we are, rewritten on every wake; never edited by hand; the page the person reads or hears
  state.json          the one owner of Foreman's intent: the idea, the plan, the asks, the decisions index, the runs
  decisions/          one file per decision, dated, with who made it; replaced words kept with "Superseded by"
    0001-<slug>.md
  journal.jsonl       append-only: each wake, ask, answer, run started and finished, with UTC times from `date -u`
```

Only Foreman writes `state.json` and `now.md`. Subagents never do: they produce facts (a branch, a prove report, a
review verdict), and Foreman reads them on its next wake. One writer means no merge conflicts on the state, which is the
failure the shared totals table had (lesson 13).

**The shape of `state.json`.** It mirrors the things it will become (below), so moving it is a move, not a rewrite: the
same trick H1 uses for its run states (`H1-agent-harness.md:305-310`).

```ts
// foreman/state.json, version 0. The shape the Foreman plugin's skills read and write.
type ForemanState = {
  readonly version: 0;
  readonly plugin: string;            // the Foreman version that last wrote this file (lesson 12)
  readonly idea: string;              // one sentence, the person's words
  readonly loop: "ideation" | "dev" | "extraction";
  readonly slices: ReadonlyArray<{
    readonly id: string;              // "company-and-members"; plain words, never "S1"
    readonly title: string;
    readonly doneWhen: string;        // the check that proves it, word for word
    readonly journeys: ReadonlyArray<string>; // journey files; their green or red is read from prove, never stored
  }>;
  readonly asks: ReadonlyArray<{
    readonly id: string;
    readonly question: string;        // one sentence for the ear
    readonly recommended: string;
    readonly blocks: ReadonlyArray<string>;   // slice ids it holds up
    readonly kind: "question" | "money" | "credential" | "promote" | "extract"; // K11's attention kinds, plus extract
    readonly askedAt: string;
  }>;
  readonly decisions: ReadonlyArray<{ readonly id: string; readonly file: string; readonly by: "person" | "foreman" }>;
  readonly runs: ReadonlyArray<{
    readonly id: string;
    readonly role: "journey-author" | "checks-author" | "climber" | "framework-builder" | "reviewer";
    readonly slice: string;
    readonly branch: string;
    readonly startedAt: string;
  }>;
  readonly limits: { readonly usdPerDay: number }; // the person's cap; Aaron's is 10 (AGENTS.md)
};
```

**What is never stored:** whether a journey is green, how many blanks are open, what is stale. Those are read fresh on
every wake from `ortho prove`, `ortho check` and `ortho impact`. A status Foreman typed would drift, as the board did
(lesson 18); a status read from the tools can't.

### How the portal reads it

Not at all, in version zero. The portal is generated from the app's model (`design/portal.md`, "The frame"), and
Foreman's state is not in the model. The person reads `foreman/now.md` on GitHub or in their editor, or hears it at
session start. That is the floor, and it ships now.

The next step, once the first feature plugin has been mounted end to end (the model draft says none has, section 3), is
to make Foreman's state a feature plugin of its own, `@orthograph/foreman`, mounted in the app's development
environment. Its things are `Slice`, `Ask`, `Decision` and `Run`, with the shapes above. Then the portal shows them with
no portal code: a "foreman · feature" group in the tree, Foreman's asks in the "Needs you" count, which reads K11's
`attention` slot (`design/portal.md:163-164`; `K11-work-board.md:71`), and Foreman's skills read and write its state
through the generated SDK and MCP tools instead of editing JSON. Question 3 at the end puts this to Aaron.

### Later: the same state in a durable actor

H1 already designs a run as a declared thing that lives as an actor (`H1-agent-harness.md:305-310`) and the chat as a
Run of `@orthograph/agents` (K10 section 1). Foreman's later form is one long-lived `@orthograph/agents` agent per app,
whose memory is the `@orthograph/foreman` things above, stored in its own Durable Object. Its wake becomes an alarm or an
event, not a hook. Nothing in version zero blocks that: the file shapes are the things' shapes, and the skills become the
agent's skills unchanged (H1.6 reads the same `SKILL.md` layout, `H1-agent-harness.md:175-178`).

## 5. Proactivity: what wakes Foreman

An agent in a harness acts only when something starts a turn. Version zero uses what the harness already gives:

| Waker | In version zero | What Foreman does |
|---|---|---|
| **Session start** | a `SessionStart` hook in `hooks/hooks.json` prints `foreman/now.md` and loads the `foreman` skill | the wake routine, below, then says where we are |
| **A subagent or side session finishes** | the harness's own completion notice | read what it produced, update state, start the next step |
| **The person speaks** | their message | answer, then drive: the next step or one batched ask |
| **Stopping** | a `Stop` hook checks `foreman/` has nothing uncommitted or unpushed, and says so once if it has | commit and push the state (lesson 11) |
| **CI finishes** | nothing reaches a local session. The next wake reads CI through `gh` | treat red as the first thing to fix |
| **A schedule** | not in version zero. Later, a scheduled task opens a session each morning to run `where-are-we` and leave `now.md` current | the same wake routine, read-only |

Later, in the durable form, CI events and the app's own events (`agents.events.runFinished`, K10 section 5) wake it
directly. Question 4 asks how far version zero should reach.

**The wake routine** (the `where-are-we` skill), in order:

1. Read `foreman/state.json` and the journal's last lines.
2. Gather the facts: `ortho check` (blanks, drift), `ortho model --json` (what is declared), `ortho impact` (what is
   stale), the last prove report, `git status`, open pull requests and their CI.
3. Reconcile: a run that finished, a check that went red, an answer that arrived. Each becomes a journal line.
4. Rewrite `foreman/now.md` from the state and the facts.
5. Say it: three sentences, for the ear.
6. Drive: start what is blocked first (lesson 19), then the next slice step; or put the batched ask.

## 6. Legibility: where you are, in plain words

This is the problem Foreman solves first. Aaron gets lost in a multi-thread build; the board went stale; a sitrep came
at the wrong height (lessons 16 and 18). Foreman's answer has three parts.

**One page, always current, never hand-edited.** `foreman/now.md`, rewritten on every wake:

```markdown
# Where we are: Capxul, 20 November 2026, 14:05 UTC

**In one breath.** We're shaping the first slice: a company, its members, their invitations and signing in with a
wallet. The blueprint compiles with four open blanks. Nothing is built yet.

**I need from you.** Two answers, both blocking the membership journeys. My recommendation is first in each.
1. Can a company have more than one owner? I'd say yes: directors are co-owners.
2. Does an invitation expire? I'd say yes, after seven days.

**Moving.** Nothing running.

**Next.** When you answer, I start the journey author on company and members.

## The map
| Loop | Slice | Journeys green | Blanks | Stale |
|---|---|---|---|---|
| ideation | company and members | not built | 4 | none |
| not started | invitations | | | |
| not started | wallet sign-in | | | |
```

**Spoken at every wake, in the same order:** the idea and the loop, what moved, what I need, what's next. Big picture
first, detail on request (lesson 16).

**In the portal, later:** the same page as the `@orthograph/foreman` group (section 4), with the asks in "Needs you".

The map has three heights, and Foreman always speaks from the top down: the **loop** (ideation, dev, extraction), the
**slice** (company and members), and the **step** (journeys written, checks fair, climbing, reviewed). A person never
has to know what a thread is.

## 7. Guardrails, and what Foreman always asks

**Always asks, and waits:**

| Before | Why |
|---|---|
| any decision about what the app does or who may do it | the product is the person's (`design/frame/skills.md:106`: the read-back is "a person's step, never the agent's") |
| loosening a contract that is already proved | `design/frame/skills.md:417`, W4 step 1 |
| spending past the person's daily cap, or starting anything in the cloud | `AGENTS.md`: $10 a day for Aaron; the cap is in `state.json` |
| creating or using a credential | `AGENTS.md`: never create a cloud credential without a written yes |
| anything outward-facing or irreversible: production, publishing a package, deleting data, a message to anyone | the standing rules |
| extracting a plugin | it changes what other apps mount |
| editing Orthograph itself | it is another repository with its own owner and gate |

**Decides alone, records why, and says so:** how the blueprint is shaped, the order of slices, which role does what,
fixes that keep a proved contract, merging its own pull requests in the app's repository once CI is green and a 🔍 has
passed, if the person has said yes to that once (a decision file).

**How it asks:** batched, each question with a recommendation, for the ear; and in writing in the grill format (the
person's `CLAUDE.md`, "Batch-grill question format"), with the real code. An answer becomes a decision file the same
turn.

**Money.** Each subagent run carries a budget. Before starting runs, Foreman checks the day's spend against
`limits.usdPerDay`, the way H2.9 reserves before a run (`H2-agent-runs-and-benchmarks.md:233-244`). Version zero can only
estimate from the harness's reported cost; past the cap it stops starting runs and asks.

**Machine and secrets.** The standing rules apply unchanged: stop only what you started, by process id; never print a key
(lessons 10 and 24).

## 8. Its tools

| Tool | What Foreman uses it for | Today |
|---|---|---|
| `ortho model --json` | what is declared, for the map and for explaining | built (`packages/cli/src/main.ts:23`) |
| `ortho add thing`, `operation`, `read`, `journey` | declaring | built (`packages/cli/src/main.ts:139`) |
| `ortho check` | blanks, types, rules, drift | built (`packages/cli/src/main.ts:145`) |
| `ortho generate` | outputs and scaffolds | built (`packages/cli/src/main.ts:157`) |
| `ortho prove`, `--empty`, `--only` | the climb, and proof the checks mean something | built (`packages/cli/src/main.ts:65`); `--report` is on `goal/stage-1` (the model draft, section 3) |
| `ortho impact` | what a change made stale | built (`packages/cli/src/main.ts:169`), local only |
| `ortho brief <operation>` | a climber's brief | built (`packages/cli/src/main.ts:235`) |
| `ortho dev` and the portal | showing the person their app | built (`packages/cli/src/main.ts:37`); the portal shows live calls only during a prove (the model draft, section 5) |
| the factory | builder agents | version zero: Claude Code subagents and sessions, each in its own worktree. Later: `factory.roster.for(kind)` and `agents.run.start` (`K10-factory.md:209-216`) |
| `gh` | pull requests, CI | the person's own GitHub sign-in |

**What happens when Orthograph falls short.** Foreman will hit gaps in the framework, as Capxul's test drive does
(`design/foreman/test-drive-capxul.md`). The rule: a gap is never patched in the app. Foreman writes it as a snag with
a journey that can't be walked, and either waits with an ask or, where the person owns Orthograph too, starts the
framework builder in Orthograph's repository. The app keeps a `Blueprint.todo` naming the gap until then.

**A guard the person's repository lacks.** Orthograph's own CI refuses a builder branch that touches the checks
(`builder-paths`). An app made by `ortho new` has no such job. Version zero holds the line by role briefs and by the 🔍
checking it (reviewer item 2); a generated `builder-paths` job for apps belongs in the preset's CI, and is listed as a
framework finding in the test drive.

## 9. What this changes, and what it doesn't

- No live document's words change, so this record has no `## Supersedes` section. The agent kit
  (`design/frame/skills.md`) stands: Foreman is the persona and loops over it, and takes the kit's skill names where
  they overlap.
- `design/handoff.md`'s decision list gains `F-foreman`.
- Building it is a goal of its own, after Aaron's answers: the plugin folder, its hooks, and a first run on Capxul with
  Aaron as the person.

**On the name.** "Foreman" read aloud is the same sound as "Forman", the framework's retired name, which is still in
dated records 137 times (`design/naming.md:45`). The name search already noted that "heard aloud it is 'foreman'"
(`design/naming-search.md:139`). Aaron listens to text-to-speech, so in a sentence about the old design the two can't be
told apart. It is his name to keep; this record keeps it.

---

## The forks for Aaron

Shared terms for this round:

- **The person:** whoever builds an app with Foreman; for Capxul, you.
- **Role skills:** the skills that carry a role's practice: `author` and `reviewer` today, in `.agents/skills/`.
- **The state:** the files in section 4, `foreman/state.json`, `now.md`, `decisions/` and `journal.jsonl`.
- **Floor:** the smallest version that does the real thing now.

## Q1 — Do the conductor and Foreman share one copy of the role skills?

**The problem, in code.** The practices that make reviews and checks trustworthy live in two skills that are written for
this repository: they cite its milestones and branches. Foreman needs the same practices for an app. Copy them, and the
next lesson reaches one copy and not the other, which is exactly how the author skill reached the goal branch eight
hours late (lesson 12).

```md
<!-- .agents/skills/author/SKILL.md:24-26 -->
5. **It can't be passed hollow.** List what the check reads: each field, element, row, link and type, and each input
   it judges (every recorded answer, every state, every role). For each, plant one wrong output for every way below
   that applies, and show it fails:
```

```md
<!-- .agents/skills/threads/SKILL.md:24 -->
| ✍️ | Author | Writes the journeys and checks for a step from its declarations, before any build, and proves each check fair (the `author` skill) | The journeys fail on empty handlers, in a pull request into the layer, with the `author` skill's six proofs |
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `.agents/skills/author`, `reviewer` | they would move or be linked |
| `.claude/skills`, `.claude/agents/reviewer.md` | links into `.agents/skills/` today (`AGENTS.md`, "Threads") |
| Foreman's five subagents | each points at a role skill |
| the Scribe's proposals | a skill change must reach both users (lesson 12) |

**The options**

**Today** — two role skills in `.agents/skills/`, written for building Orthograph; nothing for an app.

**A · One copy in the plugin, linked from here** (recommended)
```bash
# the role skills move into the plugin, worded for any Orthograph project;
# this repository links to them, as .claude/skills already links to .agents/skills
plugins/foreman/skills/author/SKILL.md
plugins/foreman/skills/reviewer/SKILL.md
.agents/skills/author   -> ../../plugins/foreman/skills/author
.agents/skills/reviewer -> ../../plugins/foreman/skills/reviewer
# what is only about this repository (branch names, -build, the ratchet file) stays in AGENTS.md and the conductor skill
```

**B · Two copies**
```bash
.agents/skills/author/SKILL.md              # for building Orthograph
plugins/foreman/skills/author/SKILL.md      # copied, then edited for apps
```

**C · Foreman is the conductor**
```bash
# one persona for both; .agents/skills/conductor becomes a Foreman mode
plugins/foreman/skills/foreman/SKILL.md     # "if this repository is Orthograph, run threads and milestones"
```

**You do X → what happens**

| Scenario | A · One copy, linked | B · Two copies | C · Foreman is the conductor |
|---|---|---|---|
| The Scribe finds a new review miss | one edit reaches both | two edits, and one gets forgotten | one edit |
| Foreman reviews Capxul | the same 🔍 that reviews Orthograph | a copy that may lag | the same |
| You talk to the conductor about milestones | unchanged | unchanged | it speaks as Foreman, with app words |
| A role skill needs a line only Orthograph needs | it goes in `AGENTS.md`, not the skill | edit one copy | a branch inside the skill |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ a move and two links | ✅ a copy, today | ⚠️ rewrites the conductor first |
| Reversibility | ✅ undo the links | ✅ trivial | ❌ hard to split again |
| Blast radius | ⚠️ two skills reworded | ✅ none | ❌ every thread's brief |
| Correctness | ✅ one owner per practice | ❌ two owners drift | ✅ one owner |
| Fit | ✅ the same link pattern as `.claude/skills` | ⚠️ against "one fact, one owner" | ❌ the two jobs differ in scale and person |

**Recommendation: A.** One owner per practice is the lesson the record teaches most often, and the link pattern is
already how this repository serves its skills to every agent.

## Q2 — Where does Foreman's state live in version zero?

**The problem, in code.** Foreman must remember what is decided, what it is waiting on, and the plan, across sessions
and across harnesses. The last time state lived somewhere other than the repository, an account ran out and a morning
was lost (log.md:1016), and the board went stale while the work moved (log.md:946). The kanban skill's answer was to save
the board into the repository:

```md
<!-- .agents/skills/kanban/SKILL.md, "Where things are" -->
| `STATE.md` | Where the project stands, in words, at the last snapshot: read it first |
| `data/tasks.json`, `threads.json`, `lanes.json`, `meta.json` | The board's whole database at the last snapshot, `{id: document}` |
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| every Foreman skill | each reads and writes the state |
| the portal, later | reads the same shapes (Q3) |
| the durable actor, later | the shapes become its things (section 4) |
| the person's repository | gains a folder |

**The options**

**Today** — nothing for an app. For Orthograph: `design/handoff.md` and the kanban board, both hand-updated.

**A · A `foreman/` folder of files, one writer** (recommended)
```text
foreman/now.md          generated each wake
foreman/state.json      intent only; status read fresh from ortho
foreman/decisions/0001-<slug>.md
foreman/journal.jsonl
```

**B · One `FOREMAN.md`**
```markdown
# Foreman
## Decided
- 20 Nov: directors are co-owners
## Waiting on you
- Does an invitation expire?
## Plan
1. company and members (in progress)
```

**C · GitHub issues and a project board**
```bash
gh issue create --title "Ask: does an invitation expire?" --label foreman:ask
gh project item-add 3 --owner <person> --url <issue>
```

**You do X → what happens**

| Scenario | A · Folder of files | B · One markdown file | C · GitHub issues |
|---|---|---|---|
| You open a fresh session in Codex instead of Claude | it reads the same files | it reads the same file | it needs `gh` and network |
| A climber and Foreman both finish at once | only Foreman writes; no conflict | conflict if both edit | no conflict |
| You ask "where are we" | `now.md`, current | as current as the last hand edit | many issues to read |
| Later, the state moves to the portal | the shapes are already the things' shapes | a parser of prose | an import |
| You read it without an agent | `now.md` | yes | yes, on GitHub |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ files today | ✅ one file today | ⚠️ needs labels, a board and network |
| Reversibility | ✅ delete a folder | ✅ | ⚠️ issues stay public in the repository |
| Blast radius | ✅ one folder | ✅ one file | ⚠️ the person's issue tracker |
| Correctness | ✅ status never stored, so never stale | ❌ status typed by hand drifts (lesson 22) | ⚠️ open or closed is typed by hand |
| Fit | ✅ the kanban skill's lesson; H1's "a move, not a rewrite" | ⚠️ the kanban's old staleness | ❌ outward-facing by default |

**Recommendation: A.** It survives any harness, has one writer, and never stores a status the tools can compute.

## Q3 — How does the portal show where you are?

**The problem, in code.** The portal is the artifact a person shares, and it is generated from the app's model.
Foreman's state is not in the model, so today the portal can't show it. The portal already has a slot for "what waits on
a person", fed by any mounted feature:

```md
<!-- design/portal.md:163-164 -->
- **The top bar.** The environment and window control (Q12), search over the model (`⌘K`), the "Needs you" count
  (K11's attention, from any mounted feature) and the chat.
```

```md
<!-- design/decisions/K11-work-board.md:71 -->
| `attention` | database | What only a person decides, as F5: promote, money, credential, question, plus `goal` (a goal the manager proposes from a signal) |
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| `design/portal.md` | a new group in the tree, asks in "Needs you" |
| mounting a feature (M1.07, M1.08) | built, but no example app has mounted one end to end (the model draft, section 3) |
| `@orthograph/agents`, later | Foreman's durable form reads the same things |
| Foreman's skills | read and write state through files, or through the SDK |

**The options**

**Today** — `ortho dev` shows the app's own things; nothing about Foreman.

**A · Files now; Foreman's state as a feature plugin once mounting is proved** (recommended)
```ts
// later: one mount file in the app, the same shape as examples/plugged-in/blueprint/projections/server.ts:5
// on goal/stage-1 (`export default Blueprint.use(server);`)
import { Blueprint } from "orthograph";
import { foreman } from "@orthograph/foreman";
export default Blueprint.use(foreman);
// its things: Slice, Ask, Decision, Run. Asks fill the portal's attention slot.
// A mount is app-wide today: `use` takes the plugin and its verbs, nothing about environments
// (packages/orthograph/src/modules/plugins/service.ts:31 on goal/stage-1), so "development only" is a framework gap.
```

**B · A portal page that reads `foreman/*.json`**
```ts
// a hand-written portal face, reading files rather than the model
Portal.face({ sidebar: "Foreman", views: { one: readJson("foreman/state.json") } });
```

**C · A separate shared page, like the kanban board**
```text
https://claude.ai/artifact/<id>    Foreman's board, with its own database, outside the portal
```

**You do X → what happens**

| Scenario | A · Files, then a feature | B · A page over files | C · A separate page |
|---|---|---|---|
| You share where Capxul stands with a co-founder | `now.md` now; the portal later | the portal | a second link to keep |
| Foreman's state changes shape | the blueprint changes, everything regenerates | the page breaks | the page and its database |
| An agent in the portal's chat wants your open asks | a generated read | a file read | an outside call |
| The first feature mount turns up a gap | found by Foreman's own plugin, which is the point | not tested | not tested |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ `now.md` ships now | ⚠️ needs the extension slot built | ✅ quick |
| Reversibility | ✅ unmount one file | ⚠️ | ✅ |
| Blast radius | ⚠️ waits on mounting | ⚠️ the portal gains a non-model page | ✅ none |
| Correctness | ✅ falls out of the model | ❌ against "every page belongs to a thing" (K10 section 6) | ❌ a hand-kept copy |
| Fit | ✅ Aaron's rule: build it in an app, then extract | ❌ | ⚠️ the board that went stale |

**Recommendation: A.** The page ships now as a file, and the portal gets it the way everything else gets there: from
the model.

## Q4 — What wakes Foreman in version zero?

**The problem, in code.** A harness acts only when asked. If nothing wakes Foreman, it can't drive the work, and the
person is back to asking "where are we". Claude Code's hooks can start a turn's context; a plugin declares them:

```jsonc
// plugins/foreman/hooks/hooks.json (proposed, not built)
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "cat foreman/now.md 2>/dev/null; echo 'Run the foreman skill.'" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "git status --porcelain foreman/ | grep -q . && echo 'foreman/ has unsaved state' >&2 && exit 2 || exit 0" }] }]
  }
}
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the `foreman` and `where-are-we` skills | they run on every wake |
| spend | every wake is a model call |
| Codex | has no hooks of the same shape; it wakes on the person's message |
| the durable form, later | wakes on events instead |

**The options**

**Today** — the conductor wakes when Aaron speaks, or when a thread's message arrives.

**A · Session start, finished subagents, the person, and a save check on stop** (recommended)
```text
SessionStart hook  -> wake routine
subagent finished  -> reconcile, start next
person speaks      -> answer, then drive
Stop hook          -> state committed and pushed?
```

**B · A, plus a scheduled morning wake**
```text
a scheduled task, 07:00 local: open a session, run where-are-we read-only, leave now.md current
```

**C · A, plus CI events through a cloud routine**
```text
on: workflow_run completed -> a cloud session runs where-are-we, comments the result on the pull request
```

**You do X → what happens**

| Scenario | A · Hooks | B · Plus a schedule | C · Plus CI events |
|---|---|---|---|
| You open a session after two days away | it tells you where you are first | it was already current | it was already current |
| CI goes red overnight | found at your next session | found at 07:00 | found at once, and posted to the pull request |
| You use Codex | wakes on your message only | the same | the same |
| Cost when nothing changes | none | one small run a day | one run per CI run |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ hooks exist today | ✅ | ⚠️ a cloud session per event |
| Reversibility | ✅ | ✅ | ⚠️ comments are public |
| Blast radius | ✅ the session only | ✅ | ⚠️ outward-facing |
| Correctness | ✅ | ✅ | ✅ |
| Fit | ✅ | ✅ | ⚠️ a cloud session can't reach a local one (`AGENTS.md`, "Standing rules") |

**Recommendation: A**, and B once a person has a build running overnight. C waits for the durable form, where events
are native.

## Q5 — Which decisions are Foreman's, and which are yours?

**The problem, in code.** Foreman is meant to drive, so the person mostly decides. Draw the line too tight and Foreman
asks about every field; too loose and it decides what the app does. This repository drew the line for the conductor:

```md
<!-- AGENTS.md, "Who decides" -->
- Come back to Aaron only when truly blocked: money beyond the cap, a credential, production, something outward-facing
  or irreversible, or a fork where the goal itself is unclear.
```

and the frame drew it for shaping an idea:

```md
<!-- design/frame/skills.md:106-107 -->
plain words; the chat is not kept (S4). *Done when:* `ortho check` compiles, every unanswered question is a blank, and
the person has read the stories back and said yes (a person's step, never the agent's).
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the `ask` skill | what it asks |
| section 7's guardrails | the list of always-asks |
| `foreman/decisions/` | `by: "person" | "foreman"` |
| your time | every ask is time spent listening |

**The options**

**Today** — the conductor decides architecture and asks Aaron for product, money, credentials and production.

**A · Foreman decides how; you decide what, and say yes to the stories** (recommended)
```text
yours:     what the app does, who may do it, what is refused, money, credentials, production, extraction
           the read-back of each slice's journeys
Foreman's: blueprint shape, slice order, roles, fixes within a proved contract, merging when the gate passes
```

**B · You approve every blueprint change**
```text
yours:     every `ortho add`, every edit under blueprint/
Foreman's: handlers, tests, merges
```

**C · You approve only at gates**
```text
yours:     a slice is ready; a slice is done; production
Foreman's: everything between, including what is refused and who may act
```

**You do X → what happens**

| Scenario | A · How vs what | B · Every blueprint change | C · Gates only |
|---|---|---|---|
| Foreman wants a `deleted` state on company | it asks: deleting is product | it asks | it adds it; you see it at the gate |
| Foreman splits invitations into its own slice | it decides and tells you | it asks | it decides |
| A directors-only refusal is added | it asks: who may act is yours | it asks | it decides |
| You're away for a day | it keeps building between asks | it stops at the first edit | it runs to the next gate |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ |
| Reversibility | ✅ decisions are files | ✅ | ⚠️ product calls made silently are found late |
| Blast radius | ✅ | ⚠️ you become the bottleneck | ⚠️ |
| Correctness | ✅ product calls stay yours | ✅ | ❌ who may act decided by an agent |
| Fit | ✅ mirrors "Who decides" and the frame's read-back | ❌ against "Foreman drives" | ⚠️ |

**Recommendation: A.** It is the line this repository already draws for its own conductor, with the read-back the frame
already makes a person's step.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| 1 | Shared role skills between the conductor and Foreman | A · one copy in the plugin, linked from here |
| 2 | Where the state lives | A · a `foreman/` folder, one writer, status never stored |
| 3 | How the portal shows it | A · `now.md` now; a feature plugin once mounting is proved |
| 4 | What wakes it | A · session start, finished work, you, a save check; a schedule later |
| 5 | Who decides | A · Foreman decides how, you decide what |

**Answer key.** Reply with the question number and a letter, for example "1 A, 2 A, 3 C, 4 B, 5 A". Anything you don't
answer takes the recommendation.
