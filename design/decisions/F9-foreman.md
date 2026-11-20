# F9: Foreman, version zero

Proposed 20 November 2026 as a draft for Aaron, and revised the same day after his answers to the first draft (relayed
by the conductor; his own phrases are quoted). Nothing here is built. The architecture is the building agent's to
decide (`AGENTS.md`, "Who decides"); the four forks at the end are the ones his answers left open.

**Foreman is a working name.** Aaron may change it. Read aloud it sounds like "Forman", the framework's retired name,
which is still in dated records (`design/naming.md:45`); the name search already noted that "heard aloud it is
'foreman'" (`design/naming-search.md:139`).

Read first, and leaned on throughout: the working lessons (`design/process/lessons.md`), the model draft on draft PR 185
(`design/model/README.md` on branch `claude/orthograph-model-cf3dca`, "the model draft" below), the work system as an
Orthograph app (`F5-work-blueprint.md`) and its board (`K11-work-board.md`), the agent harness (`H1-agent-harness.md`),
the factory (`K10-factory.md`), the portal (`design/portal.md`) and the frame's skills (`design/frame/skills.md`).
Words are the canon's (`docs/canon/outline.md`); **the person** means whoever builds with Foreman (for Capxul, Aaron).

## 1. What it is: an agency, not an assistant

Aaron's picture: taking an idea to an outside software firm. The firm does intake, writes the first spec, turns it into
a blueprint, scaffolds the code, and its factory builds it. Foreman is that firm. Its job is to gather everything and
turn it into a blueprint, then drive the build until the journeys are green. It has impetus: in Aaron's words, "the
thing's running, and it's coming back to prompt you, or stopping when it's fully blocked."

| Stage | What the firm produces | Orthograph's form of it |
|---|---|---|
| Intake | what the person wants, and who they are | intake questions (the work app's `question`), the person's profile (section 4) |
| Spec | the stories the app must tell | journeys, read back by the person (`design/frame/skills.md:106-107`) |
| Blueprint | the declared app | `blueprint/`: things, machines, roles, operations; open points are `Blueprint.todo` |
| Scaffold | code to fill | `ortho generate`: handler scaffolds, SDK, CLI, MCP, docs, portal |
| Build | the working app | builder agents climb until `ortho prove` is green (the factory, K10) |
| Ship and run | the app in staging and production | promotion, with the person's yes |

**The goal: a person never touches the code and still knows it's correct.** Aaron will read code for a while; other
people shouldn't have to. They get that knowledge from the portal (section 7).

**It is for us first.** Foreman builds Orthograph itself and Capxul. It is multi-purpose: the same routines run for any
project.

**Where it is going.** An always-on, durable agent, like a Slack bot, that later runs on Pi Durable through the agent
harness (H1) as part of the product itself: the same framework, the same skills, the same tools. Version zero is a
Claude Code plugin with basic proactivity, and builds nothing heavy (section 6).

**What it is not.** Not the factory: the factory (K10) is the building agents and their sandboxes, which Foreman drives.
Not the agent kit: the kit (`design/frame/skills.md`, M3.12) is per-app skills for one job each; Foreman is the routines
that use them, and takes a kit skill's name wherever it does the same job, so the kit replaces its hand-written copy.

## 2. Why the blueprint

Driven by a person, a blueprint looks over-engineered. Driven by agents, the structure is what lets one person scale
their attention, the way Effect pays off once agents write the code. Everything that falls out of it is agent-native:
the SDK, React hooks on top of it, the server, staging, production, tests, evals and hill climbing, and monitoring.
Aaron: "a way to force a swarm of agents to not build slop: it might be verbose, but it's not slop." So Foreman never
skips the blueprint to save time: an idea becomes declarations before it becomes code.

## 3. One entry point: the conductor is Foreman, used on ourselves

Decided by Aaron: there is one consistent way to deal with Orthograph. The conductor and Foreman are the same thing,
not separate skills a person has to remember or wire together. So:

- **One plugin, one entry point.** The person talks to Foreman. On Orthograph's own repository it runs the same
  routines as on Capxul's: intake, blueprint, journeys first, climb, review, report.
- **What the conductor skill holds today moves.** Starting and briefing threads becomes Foreman's subagents and side
  sessions. `design/handoff.md` and the kanban board become the work app (section 5). The rules that are only about
  this repository (milestone gates, `-check` and `-build` branches, the ratchet file) stay in `AGENTS.md`, which Foreman
  reads like any project's rules.
- **One copy of each role skill.** `author` and `reviewer` move into the plugin, worded for any Orthograph project;
  `.agents/skills/` links to them, as `.claude/skills` already links to `.agents/skills` (`AGENTS.md`, "Threads").
- **Superseding is done when the plugin lands, not in this draft.** The change that builds the plugin rewrites the
  conductor and kanban skills and `design/handoff.md`'s opening, and lists each replaced phrase under `## Supersedes`.
  Until then they stay live, because they are what is running the build today.

## 4. It knows the person

Foreman is stateful about the person as well as the project. It keeps their technical level and what they need to
hear, and goes low-level or high-level for each person. Today that knowledge is hand-written for one person:

```md
<!-- AGENTS.md:91, on main -->
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".
```

Foreman holds it as a thing in its own state (section 5), one per person:

```ts
// apps/work/blueprint/things/profile/thing.ts: proposed, in the work app beside K11's things
import { Blueprint, Schema } from "orthograph";
import { Person } from "../person/thing.ts";

/** How deep to go by default: the code itself, the design (things, machines, rules), or only outcomes. */
export const Depth = Blueprint.value(Schema.Literals(["code", "design", "outcome"]));
/** How the person takes things in: heard (text-to-speech, often on a phone), seen (pictures, the portal), or read. */
export const Channel = Blueprint.value(Schema.Literals(["voice", "visual", "text"]));

export const Profile = Blueprint.thing({
  description: "How one person wants to work with Foreman: how deep to go, how to tell them, what they check.",
  code: "PF",
  fields: {
    id: Blueprint.id("prf"),
    person: Person.fields.id,
    depth: Depth,
    channel: Channel,
    readsCode: Blueprint.value(Schema.Literals(["yes", "for now", "no"])), // Aaron: "for now"
    notes: Blueprint.text({ max: 2000 }), // what they care about, in their words; shown to them, never hidden
  },
});
```

Every routine reads the profile before it speaks: what height to start at, whether to say it or draw it, and whether
to show code. Question 4 asks how Foreman learns it.

## 5. Its state is an Orthograph app

Decided by Aaron: Foreman's state is not files in the repository and not a separate tool. It is part of the
framework. The project, the board, the requirements and the journeys are an Orthograph app, declared in a blueprint,
and Foreman's own state is built with Orthograph.

That app already has a design: the work system (F5), reshaped into the work board (K11). K11's manager is the role Foreman
fills in version zero:

```md
<!-- design/decisions/K11-work-board.md:163-165, on main -->
The manager is an agent of the agents feature (M4), declared with the work operations as its only tools, as in
`frame/examples/factory.md`. Before M4 the manager is a person (Aaron, or a Claude Code session) calling the same
operations through the CLI or MCP: the floor.
```

So Foreman version zero is that Claude Code session: the manager, plus intake, the person's profile and the routines in
section 8. Its memory is the work app's things:

| Foreman remembers | Held by | Where it is designed |
|---|---|---|
| the projects (Orthograph, Capxul) and each one's stage of life | `project`: new, with its repository and stage | question 1 |
| what the person agreed to build | `goal`, agreed once | K11, "Words" |
| the plan | `milestone` and `item`, each item with one done-when check | K11, things table (`K11-work-board.md:65-71`) |
| the requirements still open | `question`: asked, answered or spiked | F5 call 6, K11 |
| what waits on the person | `attention`: promote, money, credential, question, goal | F5 call 7, K11 |
| who is working on what | `claim`, and later the agents run it names | K11, K10 |
| decisions and why | `decision`: new, one per decision, with who made it | this record |
| who the person is | `profile`: new (section 4) | this record |
| the journeys | stay in the app's own blueprint, as code; items point at them by path | the canon |

**It plugs into what the generated app already has.** The app's model says what is declared, `ortho prove` says what
passes, and the logbook keeps the verdicts. Foreman's state points at those, and never copies them.

**Status is never stored.** Whether a journey is green, how many blanks are open and what is stale are read fresh from
the app's model, `ortho prove` and the logbook (F5 call 4: "Facts stay in the logbook"). A status someone typed drifts,
as the board did (lesson 18); a status read from the tools can't.

**"Held in a Durable Object", made exact.** Aaron said Durable Object; the rows stay in the database, because the board
needs list reads, and only Foreman's own loop is a Durable Object. F5 found this when the compiler refused:

```md
<!-- design/decisions/F5-work-blueprint.md:50, on main -->
| 3 | **Missions and runs are database rows, not actors.** The compiler refuses a list read on a thing that lives as
actors, and the board and sidebar need lists. The manager's Durable Object (one per mission) and the run's (one per
run) are agents keyed by those ids that call these operations over MCP. They hold a conversation or a harness, never
the mission's state. |
```

So the rows live in the work app's database, and Foreman's always-on loop, when it comes, is a Durable Object running
Pi Durable that calls the work app's operations. Both run in workerd, locally under `ortho dev` and on Cloudflare later.

**How Foreman reads and writes it.** Through the work app's generated tools, never by editing data: its `work` CLI and
MCP server are generated from the blueprint (`examples/work/README.md:11-12` on `goal/stage-1`). Foreman asks a question
with the `question.ask` operation, and the person answers it in the portal or by voice through Foreman.

**How the portal shows it.** For free: the work app is an Orthograph app, so its portal is generated like any other,
and K11's board is an extension of the one portal, with "Needs you" pinned on top (K11, Aaron's answer to Q4).

### What has to exist

| Piece | Today | Where it is planned | Version zero needs it? |
|---|---|---|---|
| The work blueprint in K11's shape (goal, milestone, item, claim, board, question, attention) | F5's shape is declared: 26 operations in `examples/work` on `goal/stage-1` | M3.05 makes it a feature package | yes, as declarations only: K11 already decided the shape |
| The work app's handlers | "None is written yet" (`examples/work/README.md:13` on `goal/stage-1`) | M3.06 | yes: question 2 |
| `project`, `decision`, `profile` | not declared | this record | yes; three small things |
| Facts from the logbook | a blank waiting on declared dependencies between apps (L3.01; F5 call 4) | L3.01 | no: Foreman reads `ortho` on the machine until then |
| An agent acting for a person | `Principal` is `anonymous` or `person` (F5, "Open, for the language") | M2.01, M2.03 | no: version zero runs with test people locally |
| Somewhere the work app runs | `runs: "on this machine"`, a local database (`examples/work/blueprint/environments/local.ts:3-8` on `goal/stage-1`) | staging, later | yes, locally: question 3 |
| The board inside the portal | designed (K11, `spikes/kanban-components`) | M3 | no: the work app's generated portal pages first |
| The always-on agent | Pi Durable behind H1's seam; durability proven in workerd (`H1-agent-harness.md:28`) | the harness's build steps (H1's A1 to A7, from wrapping Pi Durable to recorded runs), the manager workflow M3.10, the join M4.13 | no |

## 6. Proactivity: why a plugin, not a skill

A skill only runs when someone asks. A plugin adds hooks and schedules, which is how Foreman comes back to the person
without being asked. Version zero does the basic version now and builds nothing heavy:

| Waker | Version zero | What Foreman does |
|---|---|---|
| **Session start** | a `SessionStart` hook loads the `foreman` skill | the wake routine, then says where things stand |
| **A subagent or side session finishes** | the harness's own notice | records the fact, starts the next item |
| **The person speaks** | their message | answers, then drives: the next step, or one batched ask |
| **A scheduled check** | a scheduled task on the person's machine, set up with their yes on first run | the wake routine, read-only; anything that needs the person becomes an `attention` |
| **Stopping** | a `Stop` hook: is there work committed but not pushed? | pushes it (lesson 11) |

```jsonc
// plugins/foreman/hooks/hooks.json: proposed, not built
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "echo 'Run the foreman skill before anything else.'" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "jq -e '.stop_hook_active' >/dev/null && exit 0; test -z \"$(git log @{u}.. --oneline 2>/dev/null)\" || { echo 'Commits not pushed.' >&2; exit 2; }" }] }]
  }
}
```

The `Stop` hook lets the second stop through (`stop_hook_active` in the hook's input), so a push that fails can't
trap the session in a loop.

**The wake routine**, the same every time: read the person's profile; read the project's goals, items, claims,
questions and attention from the work app; gather the facts (`ortho check`, `ortho model --json`, `ortho impact`, the
last prove report, open pull requests and CI); record what changed; tell the person, at their height, in their channel;
then drive.

**Later**, the durable agent wakes on events and alarms instead of hooks: the manager's workflow waits "on durable
deferreds and a daily clock" (M3.10), and finished runs come back through `runFinished` (M4.13).

**Harnesses: Claude first, Codex later, by migration.** The skills are `SKILL.md` folders that Codex already reads from
`.agents/skills/`; the hooks and the schedule are the part that has to be migrated.

## 7. The portal is central

People don't know what's happening because there is no portal; the portal is the fix. It is how a person who never
reads code still knows the app is correct:

| The person wants to know | What shows it | Where |
|---|---|---|
| Does it do what I said? | each journey as a story, green or red | the app's portal, from `ortho prove` |
| What can happen to an invitation? | the thing's machine, drawn; a journey walked across it | the portal; the `machine-journey` skill animates it (`.agents/skills/machine-journey/SKILL.md:3`, on main) |
| Who may do what? | roles and refusals per operation | the portal's operation pages |
| Did a change break anything? | the grid and what `ortho impact` made stale | the portal, after each prove |
| Where are we, and what do you need from me? | the board, with "Needs you" on top | the work app's portal (section 5) |

Version zero is honest about the gap: the portal shows live calls only during a prove (the model draft, section 5),
and the board extension is M3. Until then Foreman says it, and draws it when the profile says visual.

## 8. Personality is routines

Aaron: personality means routines and workflows, and structuring and driving the conversation, the same way every
time. Foreman acts differently at each stage of a project's life:

| Stage | Routine | It asks | It shows |
|---|---|---|---|
| Intake | **Requirements gathering**: who the person is (the profile), the idea in one sentence in their words, who uses it, what must never happen, what exists already | batched, each with a recommendation | the idea back, in one breath |
| Spec | journeys as stories, by the journey author | "is this what you meant?" for each story | the stories; the machine drawn |
| Blueprint | declare things and operations; unknowns become `Blueprint.todo`, never guesses | only product forks | what is declared and what is blank |
| Scaffold and build | walk each journey with a throwaway handler before calling a slice ready (lesson 2); climb one slice at a time unless nothing is shared | nothing, unless blocked | the board moving |
| Prove and review | a 🔍 that wrote none of it; findings become failing checks first | nothing | the grid |
| Ship | promotion | always: production is the person's | what changes for users |
| Extract | at a piece's second real user, never its first | always | the plugin and what mounts it |

**How it explains.** By the profile's channel. For voice, the rules in "Talking to Aaron"
(`.agents/skills/threads/SKILL.md:55-76`): short sentences, answer first, no bare IDs. For visual, the house skills:
`machine-journey` for a lifecycle, `trace-waterfall` for one call in time, `visuals` for the rest, and the portal itself.

**The working rules**, in order, every turn:

1. Start by saying where we are, from the top down: the project and its stage, what moved, what I need, what's next.
2. Drive. End every turn with the next step started, or one batched ask. Never "let me know what you'd like".
3. Plain words before labels; the canon's words; no slice numbers or decision IDs alone.
4. Check before you claim: anything said about the code or the app is read first-hand that turn (lesson 16).
5. Separate the judge from the judged: never write a handler and the journey that tests it in the same role (lesson 5).
6. Push before you report (lesson 11).
7. Ask only when blocked, and batch it; otherwise decide, record a `decision`, and say so.

## 9. Its parts, as a plugin

```text
plugins/foreman/
  .claude-plugin/plugin.json      name, version, description
  skills/
    foreman/SKILL.md              the entry point: the working rules, the wake routine, which routine runs next
    intake/SKILL.md               requirements gathering and the profile
    shape/SKILL.md                spec and blueprint: journeys read back, declarations, blanks
    climb/SKILL.md                scaffold, build, prove, review
    ship/SKILL.md                 promotion, with the person's yes
    extract/SKILL.md              the extraction loop
    explain/SKILL.md              explaining Orthograph and this app, at the profile's height and channel
    author/SKILL.md               moved from .agents/skills, one copy (section 3)
    reviewer/SKILL.md             moved from .agents/skills, one copy
  agents/
    journey-author.md             journeys from declarations, never handlers
    checks-author.md              makes journeys executable; the author skill's six proofs
    climber.md                    fills handlers until prove is green; never touches journeys
    framework-builder.md          fixes a gap in Orthograph, in Orthograph's repository, never in the app
    reviewer.md                   the 🔍: every door, one probe each; wrote none of what it reviews
  hooks/hooks.json                session start and stop (section 6)
```

The subagents are the roles this repository already runs. Each brief points at the skill holding its practice, so each
practice has one copy (lesson 13). The split between journey author and climber is the one rule Foreman never bends.
An app made by `ortho new` has no `builder-paths` CI job, so in version zero the briefs and the 🔍 hold that line; a
generated job belongs in the preset (the Capxul test drive, finding 12).

## 10. Who decides, and what it always asks

Settled by Aaron for the manager, and it holds for Foreman: a goal is agreed once, and then "you give one authority and
the manager carries as much authority as possible" (`K11-work-board.md:340-343`). Foreman decides how: the blueprint's
shape, the order of slices, which role does what, fixes that keep a proved contract, merging in the app's repository
once CI is green and a 🔍 has passed. It always asks, and waits, before:

| Before | Why |
|---|---|
| agreeing a goal, and anything about what the app does or who may do it | the read-back is "a person's step, never the agent's" (`design/frame/skills.md:107`) |
| loosening a contract that is already proved | `design/frame/skills.md:417`, W4 step 1 |
| spending past the person's cap, or anything in the cloud | `AGENTS.md:82`: $10 a day for Aaron |
| creating or using a credential | `AGENTS.md:86` |
| production, publishing, deleting data, a message to anyone | outward-facing or irreversible |
| extracting a plugin, or editing Orthograph from an app | it changes what other apps mount; another repository's gate |

**How it asks:** batched, a recommendation first, as one short numbered list for the ear. A design fork with code to
compare also goes in writing in the grill format, which the plugin's `ask` routine holds as its own copy. Each answer
becomes a `decision` the same turn.

## 11. Its tools

| Tool | What Foreman uses it for | Today (`packages/cli/src/main.ts` on `goal/stage-1`) |
|---|---|---|
| `ortho model --json` | what is declared | built (`packages/cli/src/main.ts:24`) |
| `ortho add thing`, `operation`, `read`, `journey` | declaring | built (`packages/cli/src/main.ts:187`) |
| `ortho check` | blanks, types, rules, drift | built (`packages/cli/src/main.ts:195`) |
| `ortho generate` | outputs and scaffolds | built (`packages/cli/src/main.ts:207`) |
| `ortho prove`, `--empty`, `--only` | the climb, and proof the checks mean something | built (`packages/cli/src/main.ts:66`) |
| `ortho impact` | what a change made stale | built (`packages/cli/src/main.ts:219`), local only |
| `ortho brief <operation>` | a climber's brief | built (`packages/cli/src/main.ts:268`) |
| `ortho dev` and the portal | running an app, its world and its portal | built (`packages/cli/src/main.ts:38`) |
| the work app's `work` CLI and MCP tools | Foreman's own state | generated; handlers not written (section 5) |
| the factory | builder agents | version zero: Claude Code subagents and sessions in their own worktrees; later `agents.run.start` (`K10-factory.md:209-216`) |
| `gh` | pull requests and CI | the person's own GitHub sign-in |

**When Orthograph falls short**, as Capxul's test drive shows it will (`design/foreman/test-drive-capxul.md`), the gap
is never patched in the app. It becomes a framework item with a journey that can't be walked, and the app keeps a
`Blueprint.todo` naming it until Orthograph closes it.

## 12. What this changes

- No live document's words change in this draft, so there is no `## Supersedes` section yet; section 3 says which
  change will carry one.
- `design/handoff.md`'s decision list gains F9.
- Building it is a goal of its own, after Aaron's answers below. Its first project is decided by this record: Foreman's
  own work app, in Orthograph's repository, which makes Foreman's first user Orthograph itself. Capxul is second.

---

## The forks for Aaron

Aaron's answers settled five of the first draft's forks, which are dropped: whether the conductor and Foreman share a
core (they are one thing, section 3), where the state lives (an Orthograph app, section 5), how the portal shows it (it
falls out, section 5), what wakes it (hooks and schedules now, section 6), and who decides (K11's one agreement per goal,
section 10). Four remain.

Shared terms for this round:

- **The work app:** the Orthograph app that holds Foreman's state: F5's blueprint, reshaped to K11, in
  `examples/work` today.
- **The person:** whoever builds with Foreman; for Capxul and Orthograph, you.
- **Floor:** the smallest version that does the real thing now.

## Q1 — Is there one work app for all your projects, or one mounted into each app?

**The problem, in code.** K11 designs the work feature as a mount inside an app:

```ts
// design/decisions/K11-work-board.md:51-58, on main
// blueprint/features/work.ts: the mount is `work`
import { Blueprint } from "orthograph";
import work from "@orthograph/work";

export default Blueprint.use(work, (w) => [
  w.choose(w.choices.workers.people),          // `agents` once M4.13 lands: dispatch starts agents-feature runs
  w.authority([owner]),                        // who may agree goals and close in person; signals from them skip the inbox
]);
```

But Foreman's first project is Orthograph, which is not an Orthograph app and has no blueprint to mount into. And a
mount is app-wide: `use` takes the plugin and its verbs, nothing about environments
(`packages/orthograph/src/modules/plugins/service.ts:31` on `goal/stage-1`), so a mount in Capxul ships Capxul's build
board to Capxul's production.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `examples/work` | becomes `apps/work`, or a package every app mounts |
| Capxul's blueprint | gains a mount, or doesn't |
| the portal | one board for everything, or one per app |
| M3.05 | "the work blueprint moves into a package, mounted by `examples/work`" |

**The options**

**Today** — F5 already says the work app stands alone and moves once it runs:

```md
<!-- design/decisions/F5-work-blueprint.md:48, on main -->
| 1 | **Work is a project, `examples/work`.** It moves to `apps/work` when its handlers are built and it is deployed.
```

**A · One work app, every project in it** (recommended)
```ts
// apps/work/blueprint/things/project/thing.ts: proposed
import { Blueprint, Schema } from "orthograph";

export const Stage = Blueprint.value(Schema.Literals(["intake", "spec", "blueprint", "build", "live"]));

export const Project = Blueprint.thing({
  description: "One thing being built: Orthograph itself, or Capxul.",
  code: "PJ",
  fields: { id: Blueprint.id("prj"), name: Blueprint.text({ max: 80 }), repository: Blueprint.text({ max: 200 }), stage: Stage },
});
// each goal belongs to a project; the board filters by project
```

**B · Mounted into each app it builds**
```ts
// capxul/blueprint/features/work.ts
import { Blueprint } from "orthograph";
import work from "@orthograph/work";
export default Blueprint.use(work); // Orthograph itself has no blueprint to put this in
```

**C · Both: one work app now, and each live app later mounts work for its own production signals**
```ts
// now: A. Later, when Capxul is live, its alerts and failing checks reach the inbox of the one work app
// through K11's signals, rather than a second board inside Capxul.
```

**You do X → what happens**

| Scenario | A · One work app | B · Mounted in each app | C · Both |
|---|---|---|---|
| You ask "where are we?" across Orthograph and Capxul | one board, filtered by project | two boards, and none for Orthograph | one board |
| Capxul goes to production | its build board stays in the work app | ships with Capxul | stays out |
| A second person builds their own app | gets their own work app | their app carries it | their own work app |
| Capxul raises an alert | it reaches the work app as a signal (K11) | it lands on Capxul's own board | as A |

**Rubric**

| Axis | A · One work app | B · Mounted in each | C · Both |
|---|---|---|---|
| Floor-first | ✅ `examples/work` as it is | ❌ waits on mounting proved end to end | ✅ A now |
| Reversibility | ✅ a mount can be added later | ⚠️ removing a mount from a live app | ✅ |
| Blast radius | ✅ one app | ❌ every app's production | ✅ |
| Correctness | ✅ one place for status | ⚠️ none for Orthograph | ✅ |
| Fit | ✅ F5 call 1 | ⚠️ K11's mount, but app-wide | ✅ K11's signals |

**Recommendation: A.** It is what F5 already says, it holds Orthograph too, and production apps stay clean. C's second
half needs no decision now: it is K11's inbox working as designed.

## Q2 — What holds Foreman's state until the work app runs?

**The problem, in code.** The work app is declared, but nothing in it works yet:

```md
<!-- examples/work/README.md:13, on goal/stage-1 -->
- `src/` holds the handler scaffolds. None is written yet; journeys come first, from another agent.
```

Foreman can't keep its state in an app that doesn't run, and you've said the state is not files.

**What it touches**

| Dependent | Why it cares |
|---|---|
| when Foreman can start on Capxul | it needs somewhere to keep asks and decisions |
| the kanban board and `design/handoff.md` | carry today's state by hand |
| M3.05, M3.06 and M3.10 | the milestone plan builds the work feature, its handlers and the manager in M3 |
| the gate rule (`AGENTS.md:33-34`) | "Nothing in a milestone starts until the previous milestone's gate passes on `main`" |

**The options**

**Today** — the conductor keeps the state by hand:

```md
<!-- .agents/skills/conductor/SKILL.md:46-48, on main -->
- **Plan and decisions:** `design/build-plan.md` (mark each step done, with its proof, in the pull request that lands
  it), `design/decisions.md` and `design/decisions/`. `design/handoff.md`, which you keep, says where each piece of work
  stands, so a fresh conductor can take over.
```

**A · The work app is Foreman's first project** (recommended)
```bash
# reshape examples/work's declarations to K11 (already decided), add project, decision and profile
ortho add thing project --root examples/work
ortho check --root examples/work
# journeys by the journey author, then the climber writes the handlers
ortho prove --root examples/work
# until it proves, the kanban board carries the state, as now; then its items are imported once
```

**B · Wait for the milestone plan**
```text
M3.05  the work feature as a package
M3.06  its handlers
M3.10  the manager as a declared workflow
# Foreman starts after Gate M2 and these two land; the conductor carries on as now until then
```

**C · Files in the repository as a bridge** (the tempting one)
```text
foreman/state.json   asks, decisions, plan; imported into the work app later
```

**You do X → what happens**

| Scenario | A · Work app first | B · Wait for M3 | C · Files bridge |
|---|---|---|---|
| You ask Foreman about Capxul next week | it runs, with the board as its state | no Foreman yet | it runs |
| The work app hits a framework gap | found by Foreman's own first project | found in M3 | found later |
| The state's shape changes | the blueprint changes, everything regenerates | the same | a hand migration |
| Milestone order | pulls the work app's handlers (M3.06) ahead of Gate M2, so it needs an exception recorded as its own decision | strictly in order | in order |

**Rubric**

| Axis | A · Work app first | B · Wait for M3 | C · Files bridge |
|---|---|---|---|
| Floor-first | ✅ the real state, soon | ❌ weeks of nothing | ⚠️ ships now, but not the real thing |
| Reversibility | ✅ an example app | ✅ | ⚠️ a second store to retire |
| Blast radius | ✅ `examples/work` only | ✅ none | ⚠️ every project's repository |
| Correctness | ✅ one store, status read fresh | ✅ | ❌ you ruled it out |
| Fit | ⚠️ dogfood, but breaks the gate rule unless an exception is recorded | ✅ the gate rule as written | ❌ |

**Recommendation: A, with the exception recorded.** It is the smallest real thing, it makes Foreman's first user
Orthograph itself, and the board carries the state in the meantime. The cost is plain: the work app's handlers are
milestone 3 work (M3.06), so A sets the gate rule aside for this one example app, in a decision of its own that says
why. If you'd rather keep the rule whole, B is the honest alternative, and Foreman waits.

## Q3 — Where does the work app run until the durable agent?

**The problem, in code.** The work app's only environment runs on the machine it starts on:

```ts
// examples/work/blueprint/environments/local.ts:3-8, on goal/stage-1
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
});
```

Local means no cost and no credential, but nothing reaches it from your phone or from a cloud session, and it is down
when the Mac sleeps. Staging means you can hear where things stand from anywhere, but it needs a cloud credential and
counts against the cap:

```md
<!-- AGENTS.md:82, on main -->
- Spend at most $10 a day on cloud resources, across everything. Layer one needs no cloud at all.
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| the scheduled check | it must run where the work app is reachable |
| voice on your phone | needs the work app reachable from outside the Mac |
| the cloud cap and credentials | staging spends and needs your written yes |
| identity | locally, test people; in staging, Better Auth (M2.05) |

**The options**

**Today** — `ortho dev` serves an app and its world on this machine, and says so:

```ts
// packages/cli/src/main.ts:47, on goal/stage-1
Effect.tap(({ url, log }) => Console.log(`running at ${url}  (world at ${url}/_world, wrangler output in ${log})`)),
```

**A · Local only**
```bash
ortho dev --root examples/work      # on your Mac; a scheduled task on the same Mac runs the check
```

**B · Staging now**
```ts
// examples/work/blueprint/environments/staging.ts: proposed, the shape of
// examples/acme/blueprint/environments/staging.ts:3-11 on goal/stage-1
export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: { server: Deploy.worker({ domain: "api.work.<yours>" }), portal: Deploy.site({ domain: "work.<yours>" }) },
});
```

**C · Local until it proves, then staging** (recommended)
```text
now:   A
then:  B, once `ortho prove --root examples/work` is green and you've said yes to the credential
```

**You do X → what happens**

| Scenario | A · Local | B · Staging now | C · Local, then staging |
|---|---|---|---|
| You ask from your phone where Capxul stands | only through a session on the Mac | answered | answered, once it proves |
| The Mac sleeps overnight | the check doesn't run | it runs | as A, then as B |
| Cost when idle | nothing | a little, daily | nothing, then a little |
| Something is wrong with the work app's handlers | found locally, for free | found in the cloud | found locally first |

**Rubric**

| Axis | A · Local | B · Staging now | C · Local, then staging |
|---|---|---|---|
| Floor-first | ✅ | ⚠️ needs a credential first | ✅ |
| Reversibility | ✅ | ⚠️ a cloud resource to destroy | ✅ |
| Blast radius | ✅ | ⚠️ cloud spend | ✅ |
| Correctness | ⚠️ down when the Mac is | ✅ | ✅ in the end |
| Fit | ✅ layer one needs no cloud | ⚠️ staging before it proves | ✅ the usual order: prove, then promote |

**Recommendation: C.** Nothing goes to the cloud until it proves, and you get it on your phone as soon as it is worth
having there.

## Q4 — How does Foreman learn who you are?

**The problem, in code.** Today one person's profile is hand-written into the project's rules:

```md
<!-- AGENTS.md:91, on main -->
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".
```

Foreman needs that for every person, kept current. Get it wrong, and it talks code to someone who wanted outcomes, or
reads a wall of text to someone listening on a phone.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the `profile` thing (section 4) | what fills it |
| every routine | each reads it before speaking |
| intake | the first minutes with a new person |
| privacy | what Foreman keeps about a person, and whether they see it |

**The options**

**Today** — a line in `AGENTS.md` and a section of the `threads` skill (`.agents/skills/threads/SKILL.md:55-76`),
written by hand, for Aaron only.

**A · Ask a few questions at intake, show the profile, update it out loud** (recommended)
```text
Foreman: Before we start: do you want to read the code, see the design, or just hear what it does?
         Will you mostly listen, look, or read?
Person:  Listen. Design level. I'll read code for now.
Foreman: Got it. I'll talk at the design level and send code only when you ask. You can change this any time.
# profile.update { depth: "design", channel: "voice", readsCode: "for now" }; later changes are said, never silent
```

**B · Infer it silently from how the person talks**
```text
# profile.update after each session, from what the person asked for; never shown
```

**C · A preset per person, written by hand, as AGENTS.md does now**
```md
- Aaron listens rather than reads.
```

**You do X → what happens**

| Scenario | A · Ask, show, update | B · Infer silently | C · Hand-written |
|---|---|---|---|
| A new person starts | three questions, then it fits them | it guesses until it learns | nothing until someone writes it |
| You start reading code less | it notices, says so and asks | it shifts without telling you | someone edits the file |
| You want to know what it keeps about you | it's on your profile page | hidden | in a file |

**Rubric**

| Axis | A · Ask, show, update | B · Infer silently | C · Hand-written |
|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ |
| Reversibility | ✅ you can change it | ⚠️ you can't see what to change | ✅ |
| Blast radius | ✅ | ✅ | ✅ |
| Correctness | ✅ the person confirms it | ⚠️ guesses | ⚠️ goes stale |
| Fit | ✅ the profile is a thing, shown like any other | ❌ hidden state about a person | ⚠️ today's single-person way |

**Recommendation: A.** It fits each person from the first minute, and nothing about them is kept where they can't see it.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| 1 | One work app, or one per app | A · one work app holding every project, Orthograph included |
| 2 | State until the work app runs | A · the work app is Foreman's first project; the board carries the state meanwhile |
| 3 | Where the work app runs | C · locally until it proves, then staging with your yes |
| 4 | How Foreman learns you | A · ask at intake, show the profile, say every change |

**Answer key.** Reply with the question number and a letter, for example "1 A, 2 A, 3 C, 4 A". Anything you don't
answer takes the recommendation.
