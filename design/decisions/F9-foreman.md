# F9: Foreman, version zero

Proposed 20 November 2026 as a draft for Aaron, and revised twice the same day after he read it (his answers relayed by
the conductor; his own phrases are quoted). Nothing here is built. The architecture is the building agent's to decide
(`AGENTS.md`, "Who decides"); the three forks at the end are the ones his answers left open.

**The name is open.** Aaron keeps "Foreman" for now, because it fits the blueprint theme, and floated "who makes an
Orthograph?" as a way to find a better one. Nothing is renamed here. Read aloud, "Foreman" sounds like "Forman", the
framework's retired name, which is still in dated records (`design/naming.md:45`); the name search already noted that
"heard aloud it is 'foreman'" (`design/naming-search.md:139`).

Read first, and leaned on throughout: the working lessons (`design/process/lessons.md`), the model draft on draft PR 185
(`design/model/README.md` on branch `claude/orthograph-model-cf3dca`, "the model draft" below), the work system (F5)
and its board (K11), the logbook (D3), the agent harness (H1), the factory (K10), the portal (`design/portal.md`) and the
frame's skills (`design/frame/skills.md`). Words are the canon's (`docs/canon/outline.md`); **the person** means whoever
builds with Foreman (for Capxul and for Orthograph, Aaron).

## 1. What it is: a teammate

Foreman is an internal product lead, working with someone who doesn't know how to be a product lead. Not an outside
firm and not an assistant: in Aaron's words, "a teammate is a teammate". It owns ideas, iteration, ideation, code
spikes, and knowing where the project is. When a project starts, Foreman instantiates it; from then on it owns the code
and the pipeline, and knows where we are in it. It has impetus: "the thing's running, and it's coming back to prompt
you, or stopping when it's fully blocked."

**The goal: a person never touches the code and still knows it's correct.** Aaron will read code for a while; other
people shouldn't have to. They get that knowledge from the portal (section 7).

**It is for us first.** Foreman builds Orthograph itself and Capxul. The same routines run for any project.

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
skips the blueprint for real work. A spike may skip it, because a spike is thrown away (section 3).

## 3. How a project moves: a loop, not a line

Building doesn't go in a straight line. You go backwards and forwards: have an idea, spike something, get it working,
then maybe make a plugin, or maybe not; "everything doesn't have to be a plugin." So the project's life is a machine
whose moves go both ways, and spikes and ideas are things that can happen in any state:

```ts
// @orthograph/foreman/blueprint/things/project/machine.ts: proposed
import { Blueprint } from "orthograph";
import { Project } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Project, {
  states: ["exploring", "shaping", "building", "live"],
  moves: {
    start:   { from: [], to: "exploring", emits: Events.ProjectStarted },                                // made by `ortho new`
    shape:   { from: ["exploring", "building", "live"], to: "shaping", emits: Events.ShapingStarted },   // back to the blueprint
    build:   { from: ["shaping"], to: "building", emits: Events.BuildingStarted },                       // needs an agreed blueprint
    ship:    { from: ["building"], to: "live", emits: Events.ProjectShipped },
    rethink: { from: ["shaping", "building", "live"], to: "exploring", emits: Events.RethinkStarted },  // back to ideas
  },
  notFrom: { exit: 60 },
});
// Every move is the person's: the operations that take them are `allowed: [owner]` (section 10).
```

| State | What Foreman does there | What can happen in it without a move |
|---|---|---|
| **Exploring** | turns ideas into questions and spikes; on a new project, asks the profile questions first (section 4) | ideas, spikes, questions, decisions |
| **Shaping** | declares things and operations; reads journeys back as stories; open points are `Blueprint.todo` | spikes, to settle a fork with code |
| **Building** | walks each journey before calling a slice ready (lesson 2); runs builders until `ortho prove` is green; merges | spikes; fixes; new ideas parked for later |
| **Live** | watches the app; turns what it sees into ideas | the same |

**A spike** is code that answers one question and is thrown away, as this repository already does (the `spike` skill).
**A plugin** is not a state: at any point Foreman may propose cutting a piece out as a feature, at its second real user,
never its first; or not.

## 4. It knows the person

Foreman is stateful about the person as well as the project. It keeps their technical level and what they need to
hear, and goes low-level or high-level for each person. It learns that by asking, as the first part of intake on a new
project, then shows the person what it kept and says out loud whenever it changes it. Today that knowledge is
hand-written, for one person:

```md
<!-- AGENTS.md:91, on main -->
- Aaron listens rather than reads: write to him as the `threads` skill says, "Talking to Aaron".
```

Foreman holds it as a thing (section 5):

```ts
// @orthograph/foreman/blueprint/things/profile/thing.ts: proposed
import { Blueprint, Schema } from "orthograph";

/** How deep to go by default: the code itself, the design (things, machines, rules), or only outcomes. */
export const Depth = Blueprint.value(Schema.Literals(["code", "design", "outcome"]));
/** How the person takes things in: heard (text-to-speech, often on a phone), seen (pictures, the portal), or read. */
export const Channel = Blueprint.value(Schema.Literals(["voice", "visual", "text"]));

export const Profile = Blueprint.thing({
  description: "How one person wants to work with Foreman: how deep to go, how to tell them, what they check.",
  code: "PF",
  fields: {
    id: Blueprint.id("prf"),
    person: Blueprint.id("per"),
    depth: Depth,
    channel: Channel,
    readsCode: Blueprint.value(Schema.Literals(["yes", "for now", "no"])), // Aaron: "for now"
    notes: Blueprint.text({ max: 2000 }), // what they care about, in their words; shown to them, never hidden
  },
});
```

The intake questions, asked once and in this order before anything else: do you want to read the code, see the design,
or just hear what it does; will you mostly listen, look or read; and what do you never want to be surprised by. Every
routine reads the profile before it speaks.

## 5. Its state: a feature in the app it is building

Aaron's architecture: Foreman's state is not a separate app. It is a feature, `@orthograph/foreman`, mounted into each
app when `ortho new` makes it, so it "generates and plugs into the state of the app itself that it is generating".
Orthograph apps are composable, so Foreman's things sit beside the app's own, one set per project, and the portal shows
them as part of that app's portal.

```ts
// capxul/blueprint/features/foreman.ts: written by `ortho new`
import { Blueprint } from "orthograph";
import foreman from "@orthograph/foreman";

export default Blueprint.use(foreman);
```

| Thing | What it holds | Where it came from |
|---|---|---|
| `project` | the one project this app is, its state in the machine above, the agreed blueprint's revision | new |
| `idea` | something the person or Foreman wants, not yet work | new; K11's inbox, made per project |
| `spike` | one question, its throwaway branch, what it found | new; the `spike` skill's README as a thing |
| `question` | what Foreman needs the person to decide | F5 call 6 |
| `decision` | what was decided, by whom, and why | new |
| `profile` | who the person is (section 4) | new |
| `item`, `claim`, `attention` | the plan, who is working on what, what waits on the person | K11's board shape, kept |

**Kept from F5 and K11:** the board's shape (items with one done-when check, claims, "Needs you" on top), and **status
is never stored**: whether a journey is green, how many blanks are open and what is stale are read fresh from the app's
model, `ortho prove` and the logbook (F5 call 4). A status someone typed drifts, as the board did (lesson 18).

**Where it is held.** Aaron said a Durable Object you instantiate when you first start the project. One rule bends
that: a thing that lives as an actor can't be listed, and the board needs lists:

```md
<!-- design/decisions/F5-work-blueprint.md:50, on main -->
| 3 | **Missions and runs are database rows, not actors.** The compiler refuses a list read on a thing that lives as
actors, and the board and sidebar need lists. The manager's Durable Object (one per mission) and the run's (one per
run) are agents keyed by those ids that call these operations over MCP. They hold a conversation or a harness, never
the mission's state. |
```

So the project's rows sit in a database, and Foreman's own always-on loop, when it comes, is the project's Durable
Object, keyed by the project and calling the feature's operations. Which database is question 1: an app has one per
environment, and Foreman's state must not be wiped when a local world is reset, nor shipped into production.

**What it plugs into.** The app's model says what is declared, `ortho prove` what passes, and the logbook keeps the
verdicts. Foreman's things point at those, and never copy them.

**How Foreman reads and writes it.** Through the app's own generated tools: its CLI and MCP server gain Foreman's
operations when the feature is mounted, as they gain any feature's. Foreman asks a question with `question.ask`; the
person answers in the portal, or by voice through Foreman.

### What this costs, against the separate work app

The previous draft put Foreman's state in one separate work app for every project. Graded honestly:

| | A feature in each app (this draft) | One separate work app (previous draft) |
|---|---|---|
| Composes with the app | ✅ the app's portal, tools and journeys include it | ❌ a second app beside it |
| Starts with the project | ✅ `ortho new` mounts it | ⚠️ the project must be added to another app |
| List reads | ✅ rows, as F5 call 3 requires | ✅ the same |
| A view across projects | ❌ none: each app sees only itself, until something reads several | ✅ one board |
| Orthograph itself as a project | ❌ Orthograph is not an Orthograph app; it needs a small app of its own that mounts only Foreman | ✅ a row like any other |
| Production carries it | ⚠️ a mount is app-wide today: `use` takes the plugin and its verbs, and no environment (`packages/orthograph/src/modules/plugins/service.ts:31` on `goal/stage-1`) | ✅ never |
| Which environment's data | ❌ open: question 1 | ✅ one app, one environment |
| Ready today | ❌ no feature has been mounted end to end (the model draft, section 3) | ⚠️ declared, with no handlers |

The feature is the right architecture: it is what "Orthograph apps are composable" means, and it is how K11 already
mounts the work feature into an app (`K11-work-board.md:51-58`). The red rows are what has to be built, below.

### What has to exist

| Piece | Today | Version zero needs it? |
|---|---|---|
| Mounting a feature end to end | built in parts; no example app has mounted one end to end (the model draft, section 3) | not at first: Foreman's things can start as app code (question 3) |
| A store per project that every environment reads, not wiped with a local world | the logbook already is one per project: "one logbook is one project's" (`design/decisions/D3.md:858`) | yes: question 1 |
| A feature whose operations aren't served in production | a mount is app-wide (`plugins/service.ts:31` on `goal/stage-1`) | no, if its things live in the project store |
| A small Orthograph app for Orthograph's own project | `examples/work` is declared, with no handlers (`examples/work/README.md:13` on `goal/stage-1`) | after Capxul: question 3 |
| A view across projects | nothing | no: the portal can list projects later |
| An agent acting for a person | `Principal` is `anonymous` or `person` (F5, "Open, for the language"); planned in M2.01 and M2.03 | no: version zero runs with test people locally |
| The always-on agent | Pi Durable behind the harness's seam; its durability proven in workerd (`H1-agent-harness.md:28`) | no |

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

**The wake routine**, the same every time: read the person's profile; read the project, its open ideas, spikes,
questions, items and attention; gather the facts (`ortho check`, `ortho model --json`, `ortho impact`, the last prove
report, open pull requests and CI); record what changed; tell the person, at their height, in their channel; then drive.

**Later**, the durable agent wakes on events and alarms instead of hooks, as K11's manager does: it waits "on durable
deferreds and a daily clock" (M3.10), and finished runs come back through `runFinished` (M4.13).

**Harnesses: Claude first, Codex later, by migration.** The skills are `SKILL.md` folders that Codex already reads from
`.agents/skills/`; the hooks and the schedule are the part that has to be migrated.

## 7. The portal is central

People don't know what's happening because there is no portal; the portal is the fix. It is how a person who never
reads code still knows the app is correct, and with Foreman as a feature, the project's state is in the same portal:

| The person wants to know | What shows it |
|---|---|
| Does it do what I said? | each journey as a story, green or red, from `ortho prove` |
| What can happen to an invitation? | the thing's machine, drawn; a journey walked across it, animated by the `machine-journey` skill (`.agents/skills/machine-journey/SKILL.md:3`, on main) |
| Who may do what? | roles and refusals on each operation's page |
| Did a change break anything? | the grid, and what `ortho impact` made stale |
| Where are we, and what do you need from me? | the project's state, its board, and "Needs you" on top: Foreman's things, in this app's portal |

Version zero is honest about the gap: the portal shows live calls only during a prove (the model draft, section 5), and
the board extension is milestone 3 work (K11). Until then Foreman says it, and draws it when the profile says visual.

## 8. Personality is routines

Aaron: personality means routines and workflows, and structuring and driving the conversation, the same way every
time. The routines follow the project's state (section 3), not a fixed order:

| Routine | Runs when | What it does |
|---|---|---|
| **Intake** | a new project, before anything else | the profile questions (section 4), then the idea in one sentence in the person's words, who uses it, what must never happen, what exists already |
| **Explore** | the project is exploring, or a fork needs code to settle | turns ideas into questions and spikes; each spike ends with what it found and the decision it supports |
| **Shape** | shaping | declares; unknowns become `Blueprint.todo`, never guesses; reads journeys back as stories; asks the person to agree the blueprint |
| **Climb** | building | walks each journey with a throwaway handler before building it; one slice at a time unless nothing is shared (lesson 9); a 🔍 that wrote none of it; merges |
| **Watch** | live | turns what the running app shows into ideas |
| **Extract** | a piece has its second real user, and the person says yes | cuts it out as a feature; or leaves it, because not everything has to be a plugin |
| **Where are we** | every wake | the four parts below, at the person's height |

**How it explains.** By the profile's channel. For voice, the rules in "Talking to Aaron"
(`.agents/skills/threads/SKILL.md:55-76`): short sentences, answer first, no bare IDs. For visual, the house skills:
`machine-journey` for a lifecycle, `trace-waterfall` for one call in time, `visuals` for the rest, and the portal.

**The working rules**, in order, every turn:

1. Start by saying where we are, from the top down: the project and its state, what moved, what I need, what's next.
2. Drive. End every turn with the next step started, or one batched ask. Never "let me know what you'd like".
3. Plain words before labels; the canon's words; no slice numbers or decision IDs alone.
4. Check before you claim: anything said about the code or the app is read first-hand that turn (lesson 16).
5. Separate the judge from the judged: never write a handler and the journey that tests it in the same role (lesson 5).
6. Push before you report (lesson 11).
7. Decide inside what's agreed, record a `decision`, and say so. Ask only for what section 10 lists.

## 9. Its parts, as a plugin

```text
plugins/foreman/
  .claude-plugin/plugin.json      name, version, description
  skills/
    foreman/SKILL.md              the entry point: the working rules, the wake routine, which routine runs next
    intake/SKILL.md               the profile questions and the idea
    explore/SKILL.md              ideas, questions and spikes
    shape/SKILL.md                declarations, journeys read back, the blueprint agreed
    climb/SKILL.md                build, prove, review, merge
    watch/SKILL.md                the live app, turned into ideas
    extract/SKILL.md              a piece cut out as a feature, or left
    explain/SKILL.md              Orthograph and this app, at the profile's height and channel
    author/SKILL.md               moved from .agents/skills, one copy
    reviewer/SKILL.md             moved from .agents/skills, one copy
  agents/
    journey-author.md             journeys from declarations, never handlers
    checks-author.md              makes journeys executable; the author skill's six proofs
    climber.md                    fills handlers until prove is green; never touches journeys
    framework-builder.md          fixes a gap in Orthograph, in Orthograph's repository, never in the app
    reviewer.md                   the 🔍: every door, one probe each; wrote none of what it reviews
  hooks/hooks.json                session start and stop (section 6)
```

The plugin is the harness side: the routines and the wakers. The `@orthograph/foreman` feature is the state side: the
things in section 5, mounted in the app. One installs into the person's agent, the other into their app.

**One entry point.** Decided by Aaron: the conductor and Foreman are the same thing. On Orthograph's own repository
Foreman runs the same routines as on Capxul's. What the conductor skill holds today moves: starting and briefing
threads becomes Foreman's subagents and side sessions; `design/handoff.md` and the kanban board become the project's
state; the rules only about this repository (milestone gates, `-check` and `-build` branches, the ratchet file) stay in
`AGENTS.md`, which Foreman reads like any project's rules. `author` and `reviewer` move into the plugin, worded for any
project, and `.agents/skills/` links to them. The change that builds the plugin rewrites the conductor and kanban skills
and lists each replaced phrase under `## Supersedes`; until then they stay live, because they run the build today.

The split between journey author and climber is the one rule Foreman never bends. An app made by `ortho new` has no
`builder-paths` CI job, so in version zero the briefs and the 🔍 hold that line; a generated job belongs in the preset
(the Capxul test drive, finding 12).

## 10. Who decides: Foreman owns the project

Aaron: Foreman owns the project, the code and the pipeline. It needs permission for very few things. Inside the agreed
blueprint "it can do what it wants. It can merge what it wants."

**It asks, and waits, for two things only:**

| Before | How it is held |
|---|---|
| **Moving the project to another state** (section 3), backwards or forwards, shipping included | every move of the project's machine is an operation `allowed: [owner]`; Foreman proposes it as a question |
| **Changing the agreed blueprint** | the person agrees a blueprint revision: a `decision` naming the model's revision, which the logbook already keeps (`design/decisions/D3.md:227-229`). A later change to what is declared (things, operations, roles, refusals) needs a new agreement. Telling that a change crossed the agreed revision is new work: `ortho impact` reports what a change made stale today, not what it changed against an agreement |

**Everything else is Foreman's:** handlers, the wording of journeys within the agreed stories, tests, spikes, the order
of work, which role does what, branches, and merging its own pull requests once CI is green and a 🔍 has passed. It
records each choice as a `decision` and says so in the next "where are we".

**What still holds, because it isn't the project's to give:** the standing rules every agent here works under:
spending past the person's cap and anything in the cloud (`AGENTS.md:82`) and creating a credential (`AGENTS.md:86`).
The harness adds its own: it asks before sending a message to anyone on the person's behalf. These are guardrails
around every agent, not the project's permissions.

**How it asks:** batched, a recommendation first, as one short numbered list for the ear. A fork with code to compare
also goes in writing in the grill format, which the plugin holds its own copy of. Each answer becomes a `decision`.

## 11. Its tools

| Tool | What Foreman uses it for | Today (`packages/cli/src/main.ts` on `goal/stage-1`) |
|---|---|---|
| `ortho new` | instantiating a project, with the Foreman feature mounted | the Nx preset today; `ortho new` is M2.09 |
| `ortho model --json` | what is declared | built (`main.ts:24`) |
| `ortho add thing`, `operation`, `read`, `journey` | declaring | built (`main.ts:187`) |
| `ortho check` | blanks, types, rules, drift | built (`main.ts:195`) |
| `ortho generate` | outputs and scaffolds | built (`main.ts:207`) |
| `ortho prove`, `--empty`, `--only` | the climb, and proof the checks mean something | built (`main.ts:66`) |
| `ortho impact` | what a change made stale; comparing against the agreed revision is new work | built (`main.ts:219`), local only |
| `ortho brief <operation>` | a climber's brief | built (`main.ts:268`) |
| `ortho dev` and the portal | running the app, its world and its portal | built (`main.ts:38`) |
| the app's own CLI and MCP tools | Foreman's state, once the feature is mounted | not built |
| the factory | builder agents | version zero: Claude Code subagents and sessions in their own worktrees; later `agents.run.start` (`K10-factory.md:209-216`) |
| `gh` | pull requests and CI | the person's own GitHub sign-in |

**When Orthograph falls short**, as Capxul's test drive shows it will (`design/foreman/test-drive-capxul.md`), the gap
is never patched in the app. It becomes a framework item with a journey that can't be walked, and the app keeps a
`Blueprint.todo` naming it until Orthograph closes it.

## 12. What this changes

- No live document's words change in this draft, so there is no `## Supersedes` section yet; section 9 says which
  change will carry one.
- `design/handoff.md`'s decision list gains this record, F9, as a draft for Aaron.
- Building it is a goal of its own, after Aaron's answers below.

---

## The forks for Aaron

Settled by Aaron's answers and dropped: whether the conductor and Foreman share a core (one thing, section 9), whether
state is files (no), what wakes it (hooks and a schedule now, section 6), who decides (Foreman owns the project,
section 10), how it learns the person (by asking, at intake, section 4), and whether its state is a separate app (a
feature in each app, section 5). Three remain, all about making that last one work.

Shared terms for this round:

- **The Foreman feature:** `@orthograph/foreman`, the things in section 5, mounted in each app at `ortho new`.
- **An environment's database:** each environment (local, test, staging, production) has its own.
- **The project store:** a store that belongs to one project and outlives every environment, as the logbook does.
- **Floor:** the smallest version that does the real thing now.

## Q1 — Which store holds the Foreman feature's things?

**The problem, in code.** An app's environments each have their own database. The local one is on the machine and is
reset with its world:

```ts
// examples/work/blueprint/environments/local.ts:3-8, on goal/stage-1
export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
});
```

If Foreman's ideas and decisions live in whichever environment is running, they are lost with a local reset, split
between local and staging, and shipped into production. One store already belongs to the project rather than to an
environment, the logbook:

```md
<!-- design/decisions/D3.md:857-858, on main -->
137. **Left for later, and said where the portal says it.** The traces route is a JSON 404 (O1's TraceSource). Per-eval results, journey outcomes and the
    release comparison are `unavailable` with the reason. There is no repository filter (one logbook is one project's here), no pull-request scope,
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| every Foreman routine | reads and writes the project's state |
| the portal | shows the project's state in every environment's portal, or only one |
| the logbook (D3) | the project store would sit beside it, or in it |
| production | carries Foreman's data, or doesn't |

**The options**

**Today** — the logbook is the only per-project store; it is found through `ARCHITECT_LOGBOOK_URL` or the running
`logbook` environment (`design/decisions/D3.md:355`).

**A · The project store, beside the logbook** (recommended)
```ts
// @orthograph/foreman/blueprint/stores/project.ts: proposed. The language already takes a declared store of any kind
// (`Blueprint.store.kind`, packages/orthograph/src/modules/stores/types.ts:18-19 on goal/stage-1); what is new is a
// host that supplies the kind "project": one store per project, in the logbook's worker, read by every environment.
export default Blueprint.store.kind("project");

// @orthograph/foreman/blueprint/things/idea/thing.ts
import project from "../../stores/project.ts";
export const Idea = Blueprint.thing({
  description: "Something the person or Foreman wants, not yet work.",
  code: "ID",
  lives: project, // `lives` takes a declared store (packages/orthograph/src/modules/things/types.ts:64 on goal/stage-1)
  fields: { id: Blueprint.id("ida"), says: Blueprint.text({ max: 500 }), from: Blueprint.id("per") },
});
```

**B · Each environment's own database**
```ts
// no `lives:`: the default. Local ideas stay local; staging starts empty; production gets a copy of the tables.
export const Idea = Blueprint.thing({ description: "…", code: "ID", fields: { /* … */ } });
```

**C · One chosen environment's database, staging**
```ts
// proposed: a choice the feature would need to offer; every environment's Foreman calls point at staging's database
export default Blueprint.use(foreman, (f) => [f.choose(f.choices.store.environment("staging"))]);
```

**You do X → what happens**

| Scenario | A · Project store | B · Each environment's database | C · Staging's database |
|---|---|---|---|
| You reset your local world | Foreman's state survives | ideas and decisions are gone | survives |
| You open the staging portal | the same project state as locally | a different, emptier state | the state |
| Capxul goes to production | production carries none of it | production gets Foreman's tables | production calls staging |
| You work offline | works while the store runs locally | works | doesn't |

**Rubric**

| Axis | A · Project store | B · Each environment's | C · Staging's |
|---|---|---|---|
| Floor-first | ⚠️ the host must supply a new store kind, "project" | ✅ works the day mounting works | ⚠️ needs staging and a credential |
| Composes with the app | ⚠️ the things are the app's, but their rows sit beside the logbook, not in the app's own database | ✅ fully: the app's own database | ⚠️ one environment's database |
| Reversibility | ✅ one store kind | ⚠️ data to merge later | ⚠️ |
| Blast radius | ✅ beside the logbook | ❌ every environment | ⚠️ couples environments |
| Correctness | ✅ one state per project | ❌ several states that disagree | ✅ one state |
| Fit | ✅ the logbook's pattern | ⚠️ the default, but wrong for project state | ❌ environments shouldn't call each other |

**Recommendation: A.** The logbook already proves a project can own a store that outlives its environments; Foreman's
state belongs there. B is acceptable only as the first week's floor, with the move to A planned.

## Q2 — Where does the project store run, until the durable agent?

**The problem, in code.** The logbook, and so the project store beside it, runs as an environment on the machine
today:

```md
<!-- design/decisions/D3.md:355-357, on main -->
64. **Where the logbook is: `ARCHITECT_LOGBOOK_URL`, else the running `logbook` environment.** The variable wins when set. Otherwise
    `Environments.status({ name: "logbook" })`, which reads the pid and the port that `architect env up logbook` keeps under
    `.architect/environments/logbook/`; this works however L2.02 starts it, so long as it keeps them where every environment does. The
```

Local means no cost and no credential, but nothing reaches it from your phone, and it is down when the Mac sleeps.
Hosted means you can hear where things stand from anywhere, but it needs a cloud credential and counts against the
cap (`AGENTS.md:82`: "Spend at most $10 a day on cloud resources, across everything").

**What it touches**

| Dependent | Why it cares |
|---|---|
| the scheduled check | it must run where the store is reachable |
| voice on your phone | needs the store reachable from outside the Mac |
| the cloud cap and credentials | hosting spends and needs your written yes |

**The options**

**Today** — the logbook runs locally, as an environment of the project.

**A · Local only**
```bash
ortho dev            # the app, its world, and the project store beside the logbook, on your Mac
```

**B · Hosted now**
```text
the project store on Cloudflare, next to a hosted logbook; every machine and your phone reach it
```

**C · Local until Foreman's things prove, then hosted** (recommended)
```text
now:   A
then:  B, once the Foreman feature's journeys pass and you've said yes to the credential
```

**You do X → what happens**

| Scenario | A · Local | B · Hosted now | C · Local, then hosted |
|---|---|---|---|
| You ask from your phone where Capxul stands | only through a session on the Mac | answered | answered, once it proves |
| The Mac sleeps overnight | the check doesn't run | it runs | as A, then as B |
| Cost when idle | nothing | a little, daily | nothing, then a little |

**Rubric**

| Axis | A · Local | B · Hosted now | C · Local, then hosted |
|---|---|---|---|
| Floor-first | ✅ | ⚠️ a credential first | ✅ |
| Reversibility | ✅ | ⚠️ a cloud resource to destroy | ✅ |
| Blast radius | ✅ | ⚠️ cloud spend | ✅ |
| Correctness | ⚠️ down when the Mac is | ✅ | ✅ in the end |
| Fit | ✅ layer one needs no cloud | ⚠️ hosted before it proves | ✅ prove, then promote |

**Recommendation: C.** Nothing goes to the cloud until it proves, and you get it on your phone as soon as it's worth it.

## Q3 — Where do Foreman's things first live, while mounting a feature isn't proved?

**The problem, in code.** `Blueprint.use` exists, but no example app has mounted a feature end to end (the model draft,
section 3), and `ortho new feature` is planned, not built (M2.10). Your own rule says build a thing in an app, use it,
then extract it; and Orthograph itself has no blueprint to mount anything into. The work app that could become
Orthograph's own project app has nothing in it yet:

```md
<!-- examples/work/README.md:13, on goal/stage-1 -->
- `src/` holds the handler scaffolds. None is written yet; journeys come first, from another agent.
```

**What it touches**

| Dependent | Why it cares |
|---|---|
| when Foreman can start on a real project | it needs its things somewhere that runs |
| the gate rule (`AGENTS.md:33-34`) | "Nothing in a milestone starts until the previous milestone's gate passes on `main`" |
| Orthograph as a project | needs a small app of its own |
| the kanban board and `design/handoff.md` | carry today's state until then |

**The options**

**Today** — the conductor keeps the state by hand:

```md
<!-- .agents/skills/conductor/SKILL.md:46-48, on main -->
- **Plan and decisions:** `design/build-plan.md` (mark each step done, with its proof, in the pull request that lands
  it), `design/decisions.md` and `design/decisions/`. `design/handoff.md`, which you keep, says where each piece of work
  stands, so a fresh conductor can take over.
```

**A · In Capxul first, as Capxul's own code; extracted at the second project** (recommended)
```text
capxul/blueprint/things/{project,idea,spike,question,decision,profile}/   app code, in Capxul's repository
# Capxul isn't bound by Orthograph's milestone gates. When Orthograph's own project app is the second user,
# the things are cut out as @orthograph/foreman, and both mount it.
```

**B · In an Orthograph project app first, in this repository**
```bash
ortho add thing project --root examples/work   # Orthograph's own project app; its handlers are milestone 3 work (M3.06),
                                               # so this needs a recorded exception to the gate rule
```

**C · As the `@orthograph/foreman` feature package straight away**
```text
packages/foreman/   a feature package, mounted by Capxul; waits on mounting proved end to end and on M2.10
```

**You do X → what happens**

| Scenario | A · Capxul first | B · Orthograph's app first | C · Feature package now |
|---|---|---|---|
| You ask Foreman where Capxul stands next week | answered, from Capxul's own portal | answered, from another app | not yet |
| You ask where Orthograph stands | the board and handoff, as now | answered | not yet |
| A framework gap turns up | found by a real app | found by a real app | found in a package with no user |
| Milestone order | untouched | an exception recorded | untouched, but waits |

**Rubric**

| Axis | A · Capxul first | B · Orthograph's app first | C · Feature package now |
|---|---|---|---|
| Floor-first | ✅ a real app, soon | ✅ | ❌ waits on mounting |
| Reversibility | ✅ app code, cut out later | ✅ | ⚠️ a published shape to change |
| Blast radius | ✅ Capxul's repository | ⚠️ the milestone plan | ✅ |
| Correctness | ✅ shaped by real use | ✅ | ⚠️ shaped by guesses |
| Fit | ✅ your rule: build in an app, then extract | ⚠️ against the gate rule | ❌ a plugin before its first user |

**Recommendation: A.** It is your build-then-extract rule, it needs no exception, and Orthograph's own project app
becomes the second user that makes Foreman a feature.

## At a glance

| # | Joint | Recommendation |
|---|---|---|
| 1 | Which store holds Foreman's things | A · a project store beside the logbook, one per project, outliving every environment |
| 2 | Where that store runs | C · locally until Foreman's things prove, then hosted with your yes |
| 3 | Where Foreman's things first live | A · in Capxul as app code, extracted when Orthograph's own project app is the second user |

**Answer key.** Reply with the question number and a letter, for example "1 A, 2 C, 3 A". Anything you don't answer
takes the recommendation.
