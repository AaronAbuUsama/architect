# Architect: the spec (draft 10, 16 November 2026)

Written by Aaron and the conductor together. **Decided** marks what Aaron has said; **Proposed** is the conductor's
draft for him to accept or change; **Open** needs a decision. Nothing is built from this until it is agreed.

## 1. What it is

- **Decided.** Architect is a framework: an Effect-native library plus its generators and checks.
- **Decided** (Aaron, 16 November 2026, replacing "a package in the Capxul repository for now"). Architect starts fresh
  in its own repository, in a folder beside `capxul-next` on Aaron's machine, so code can be pulled across directly and
  Capxul stays untouched. Its own example project is the sandbox.
- **Decided.** Nx is the monorepo tool, now, and Architect requires it.
- **Decided.** A project's **blueprint** is the package that declares what the application is. The blueprint
  generates the application's code and checks the code against itself. Architect keeps track of what is proven.
- **Decided** (Aaron, 16 November 2026). What it is, in one line: Effect, one level up. Effect makes code declare its
  errors and its needs; Architect makes the whole system declare its things, machines, events, errors, steps and
  telemetry, roles, budgets, environments and dependencies. Rich context and scaffolds fall out, for agents to
  implement or hill-climb. Opinionated, and in exchange measurable, hill-climbable, monitorable and auditable.
- **Decided** (16 November 2026). Agent native: the blueprint is the conversation between a person and their agent,
  the contract between the agents that implement it, and the map that says what a change invalidates.
- **Decided** (16 November 2026). The dev loop is two loops. Design: ideate, spike (throwaway code in `spikes/`,
  never built), specify, until the blueprint has no blanks. Build: build, test (climb the evals), deploy (promote
  through environments, provisioned from code), watch (the same evals on the running system). A change sends what
  depends on it back round.
- **Decided** (16 November 2026). Code says `Blueprint`, never `Architect`: `import { Blueprint } from
  "@architect/blueprint"`, `Blueprint.thing`, `Blueprint.todo`. The command stays `architect`.
- **Decided.** Everything generated is a full-stack Effect application.
- **Decided.** Architect is opinionated: one layout, one way of declaring, one way of proving. Names can be overridden
  in config; the defaults are the standard.

## 2. The layout

- **Decided** (Aaron, 16 November 2026, replacing `apps`, `packages`, `generated`). Three top-level folders, named for
  who writes them: `blueprint/` (what the system is), `implementation/` (how it does it) and `generated/` (everything
  Architect builds, the server included). The only loose file is `architect.config.ts`.
- **Decided** (Aaron, 16 November 2026). The chain: the server implements the API; the SDK depends on the API; the CLI
  depends on the SDK (and so does the MCP).
- **Decided.** Two kinds of generated code. Scaffolds are written once, with imports, names and `Blueprint.todo(...)`
  blanks, and are yours from then on. Outputs live under `generated/`, are rewritten on every run and never edited.
  A handler is scaffolded only once its declaration has no blanks.
- **Decided.** Scaffolding uses Nx generators where they fit, rather than rolling our own; Nx is required.
- **Decided.** Nothing project-wide is a loose file: roles live in the thing they're scoped to (`roles.ts`), and
  environments, journeys and starting worlds have a folder with one file each.

**Decided** layout:

```text
my-app/
  architect.config.ts          name, which outputs to generate, name overrides
  blueprint/                   what the system is: scaffolded, then yours
    things/<thing>/
      thing.ts                 the thing's fields and identity
      machine.ts               its states, moves and the event each move emits
      events.ts                its events, <Thing><PastTense>
      errors.ts                its refusals, <Thing><Reason>, each with an exit code
      roles.ts                 roles scoped to this thing, each with the rule that decides it
      verbs/<verb>.ts          one operation: payload, answer, errors, who may call, steps, budget
    journeys/<journey>.ts      the stories that prove the operations
    starting-worlds/<name>.ts  the data a journey starts from
    environments/<name>.ts     local, test, staging, production
  implementation/              how it does it: scaffolded with blanks, then yours
    handlers/<thing>/<verb>.ts one handler per operation
    services.ts                the services handlers use
  generated/                   rewritten by `architect generate`, never edited
    server/                    the running application: wires the handlers to the API's routes
    api/                       the contract: routes, schemas, typed errors (Effect's HttpApi)
    sdk/                       built on api: the typed client, one call per operation
    cli/                       built on sdk: `<app> <thing> <verb>`, login included
    mcp/                       built on sdk: one tool per operation
    portal/                    the blueprint's portal, docs included
    docs/                      one page per thing and operation
    infra/                     the Alchemy stacks for every declared environment
    model/                     the compiled model: every declaration, its hash and its dependencies
  spikes/                      throwaway experiments, never built
```

- **Decided** (Aaron, 16 November 2026). 2.1: the CLI is entirely generated; login and profile come from Architect's
  library, and there is no `apps/cli`. 2.2: journeys are part of the blueprint, declared in `blueprint/journeys/`. 2.3: the
  portal is a generated application that Architect supplies, like the rest; it updates itself whenever the blueprint
  or the evidence changes, and the project only configures it.
- **Open.** 2.4: The rule that a different agent from the builder writes the journeys (AGENTS.md) still holds when
  journeys live in the blueprint? Proposed: yes; where a file lives doesn't change who may write it, and `check` can
  enforce that a pull request touching a handler doesn't touch that operation's journeys.

## 3. The primitives, things first

- **Decided.** You start from the things; operations fall out of them as verbs on a thing.

**Proposed** definitions (each is one kind of file or one entry in one):

| Primitive | What it is | Declared in |
|---|---|---|
| Thing | A noun of the application with an identity and fields (company, invitation) | `things/<thing>/thing.ts` |
| Operation | A verb on a thing: payload in, answer out, errors it may refuse with | `things/<thing>/verbs/<verb>.ts` |
| Machine | A thing's states and the moves between them | `things/<thing>/machine.ts` |
| Event | What a move emits, and what it carries | with the move, in `machine.ts` |
| Error | A refusal: why an operation said no, with its exit code | `things/<thing>/errors.ts` |
| Role | Who may call: declared once, named on each operation | `roles.ts`, `allowed` on each verb |
| Step | One span an operation runs through, of a kind (database, chain, site, wait) | on each verb |
| Budget | How long an operation should take: a target, never a failure | on each verb |
| Environment | Where the application runs: local, test, staging, production | `environments.ts` |
| Journey | A story through operations, run in an environment, that produces evidence | `src/journeys/<journey>.ts` |
| Eval | A rule over evidence, with a result (section 5) | on each verb, or generic |
| Verdict | Evals combined, for one operation, at one revision, in one environment | written by CI to the logbook |
| Ratchet | A known gap between the code and the blueprint, which may only shrink | the blueprint's registry |

**Open.** 3.1: Today's "work" (a verb no server serves, like the pipeline's own steps): keep it as a kind of operation,
or drop it from Architect's first version? 3.2: Is "operation" the word, or "verb"? Pick one and use it everywhere.
3.3: Starting worlds (named states to begin a journey from): Architect's primitive, or the project's?

## 4. Generate and check

**Proposed** commands:

```text
architect new <app>                  a blank project with the full layout, lint, hooks and CI wired
architect add thing <thing>          the thing's folder and files
architect add operation <thing>.<verb>
                                     the verb's file, and a handler scaffold in implementation/, once the declaration has no blanks
architect generate                   rewrites everything under generated/
architect check                      the blueprint against the code; run by lint, git hooks and CI
architect ratchet                    the counts of known gaps; fails if one grew
```

- **Decided.** `check` runs in lint, git hooks and CI. Gaps are allowed on ratchets that only shrink.
- **Open.** 4.1: What `check` is made of: generated oxlint rules, type-level checks, generated tests, or a mix.
  Proposed: types first (a handler that doesn't match its declaration doesn't compile), then generated lint rules for
  what types can't see (a declared name retyped as a string), then the drift check (generating again changes nothing).

## 5. Proof

- **Decided.** Eval kinds include performance (p50, p95 against the budget), correctness (returned the declared
  values), behaviour (emitted this event with this value, under this circumstance, in this environment) and refusals.
- **Decided.** Environments are declared by the project; evidence and verdicts are per environment.
- **Decided.** Verdicts live outside git, in the logbook; only CI writes one (`docs/design/state-store.md`).
- **Decided.** Change makes dependents stale: when a declaration changes, everything depending on it, above all its
  evidence, must be revalidated through its evals. Start simple; finer invalidation later.
- **Open.** 5.1: Which evals are generic (every operation gets them from its declaration) and which are written per
  operation? Proposed: generic for performance, refusals, events emitted and declared steps; per operation for
  correctness of values. 5.2: What "proven" means for an operation: every eval passed in which environments?

## 6. The portal

- **Decided.** The portal is generated, like the SDK and the CLI, and supplied by Architect; it updates itself when
  the blueprint or the evidence changes (its pages from `architect generate`, its proof and staleness live from the
  logbook).
- **Decided.** The portal is the whole blueprint's site, docs included. Each thing and operation has its own page.
  HeroUI, designed in Figma first. It shows: every thing and operation with its docs; each machine walked through its
  events; which journeys use which operation; what is proven, where, by which evals; what is stale and why; the
  ratchets. No editor, no agents, for now.

## 7. Capxul as the first project

- **Decided.** Architect is built in its own repository and tested on its own example project. Capxul moves onto it
  only once the example works end to end, pulling in what it needs from `capxul-next` meanwhile. The paused work (`blueprint-context-pack.md`, section 5) is reviewed against this spec.

## 8. Requirements

**Proposed.** What Architect must do to be done, each testable in the sandbox project:

1. **Scaffold.** `architect new` makes a blank project with the full layout, Effect, lint, git hooks and CI wired, and
   it passes `architect check` with nothing declared.
2. **Grow.** `architect add thing` and `add operation` write the declaration files in their fixed places and a handler
   stub that fails until it is written.
3. **Declare.** Every primitive in section 3 has one way to be declared, in one file, as Effect code.
4. **Generate.** `architect generate` writes the SDK, the CLI, the server's routes, schemas and errors, the state
   machines, the docs (and later the MCP) under `generated/`. It is deterministic: running it twice changes nothing.
5. **Check.** `architect check` fails when the code disagrees with the blueprint: a handler that doesn't match its
   declaration, a declared name retyped, a generated file edited, generation out of date. Known gaps sit on ratchets
   that may only shrink.
6. **Environments.** A project declares its environments, and evidence and verdicts are kept per environment.
7. **Evals.** Generic evals come from the declarations (performance against the budget, refusals, events emitted,
   declared steps present); per-operation evals check values. Each has a result, an environment and a revision.
8. **Verdicts.** Only CI writes a verdict, to the logbook, proven by its OIDC token. Nothing of state is in git.
9. **Staleness.** A change to a declaration marks everything depending on it stale until revalidated.
10. **Portal.** One site shows the whole blueprint: docs, machines and events, journeys, proofs per environment,
    evals, staleness, ratchets.
11. **Names.** The standard names (server, CLI, SDK, MCP) can be overridden in `architect.config.ts`.
12. **Agent-friendly.** One file per operation, so an agent changes one place; every error message says which file to
    fix.
13. **Capxul moves onto it** only after the sandbox works end to end, side by side, without breaking a journey.

## 9. The delta: today against this spec

| Area | Capxul today | The spec | Size |
|---|---|---|---|
| Framework | `packages/blueprint-tools` (language, checks, render), but `packages/generate` and `packages/lint` hold framework parts too, and the toolkit names Capxul's paths | One `architect` package, no Capxul facts, configured by the project | Large: split and re-home |
| Layout | Flat `packages/*` (core, cli, sdk, blueprint, generate, lint, runner, scenarios, world, platform, ...) | `apps`, `packages`, `generated` | Large for Capxul; nothing for the sandbox |
| Scaffolding | None: every package written by hand | `architect new`, `add thing`, `add operation` | New |
| Things first | 20 things as folders in `packages/blueprint/src/things/`, but product and pipeline mixed, and a hand-typed domain table in `packages/generate` | Things only; the pipeline's own things move to Architect or out | Medium |
| Operations | One file per verb for most; 17 still have examples apart (R7); 16 not named from their path (R16) | One file per operation, named from its path | Small: finish the ratchets |
| Machines | Only the invitation is a machine (3.4); R4 and R5 open | Every thing with a lifecycle has one | Medium: the climb (C.1) |
| Errors | Refusals as tagged errors with exit codes, in the blueprint | The same, generated into `generated/server` and the SDK | Small |
| SDK | `packages/sdk`, hand-written around the imported declarations | `generated/sdk`, fully generated | Medium: new generator |
| CLI | `packages/cli`: command paths generated, the rest derived at run time or hand-written (#473 unmerged) | `generated/cli`, fully generated; login and profile from Architect's library | Medium |
| Server | `packages/core`: routes and handlers hand-written against the declarations | Routes, schemas and errors generated; only handlers written | Large: Core is the biggest package |
| MCP | None | `generated/mcp` | New, later |
| Docs | One generated Markdown page per thing, the glossary, the scorecard | Pages per thing and operation, read by the portal | Small |
| Check | `pnpm check`: shape, format, generate:check, lint (hand-written rules in `packages/lint`), types, tests, delta:check, words, ratchets | `architect check`: types first, then generated rules, then drift; ratchets in one registry | Medium: unify, generate the rules |
| Ratchets | 20 in a registry, six uncounted, two pairs overlapping, lists split between the blueprint and lint | One registry, each counted from day one, one per gap | Small to medium |
| Environments | Not declared; "grades" (test, real) exist in the world code | Declared in the blueprint | New |
| Evals | The runner's generic checks (events, path, timings) and per-operation checks in `packages/scenarios`; no eval as a declared thing; explainability not built | Evals declared, generic or per operation, each with a result per environment | Large: mostly new |
| Verdicts | Run records committed to git; the proofs branch never built | Verdicts in the logbook, written by CI | New: the logbook (designed, #476) |
| Staleness | None | A dependency graph; a change marks dependents stale | New |
| Portal | None: Markdown pages and the sitrep artifact | The HeroUI portal | New |
| Telemetry | Declared in `src/telemetry/`, imported, nothing generated; Core keeps a second owner of span keys | Declared once; attribute constants, resources and Axiom's datasets and monitors generated | Medium |

## 10. Nx: what it would give us

**Proposed.** Use Nx as the monorepo tool and write Architect's generators as Nx generators. What Nx gives us that we
would otherwise hand-roll (from what I know of Nx; to be verified against its current version before deciding):

- **Generators.** `@nx/devkit` generators edit a virtual file tree, so every run can be a dry run first; they write
  files from templates, update JSON, register projects, format the result, and compose (one generator can call
  another). `nx g architect:operation invitation.accept` is our `architect add operation`. A **preset** makes
  `create-nx-workspace --preset=@capxul/architect` our `architect new`.
- **Sync generators.** Generators that run before tasks to keep files in sync, with a check mode for CI that fails
  when anything is out of date. That is our `generate:check` and drift check, built in.
- **The project graph and "affected".** Nx knows which projects depend on which, and runs tasks only for what a change
  affects. That is the project-level half of staleness: change the blueprint and Nx knows the SDK, CLI, server and
  journeys are affected.
- **Caching.** Task results cached locally (and remotely, with Nx Cloud), so `check` and tests skip unchanged work.
- **Task pipelines.** "Generate before build, build before test", declared once.
- **Module boundaries.** A lint rule with tags that stops, for example, an app importing another app, or anything
  writing into `generated/`.
- **Migrations.** `nx migrate` upgrades a project when Architect changes its layout or formats: the answer to "how do
  projects keep up with Architect".

What Nx does **not** give us: the blueprint's language, Effect code generation, evals, verdicts, the logbook, the
operation-level staleness (which eval's evidence a change invalidates), or the portal. Those are Architect.

**Decided** (Aaron, 16 November 2026). Nx is used now, for Architect and its example project, and Architect requires
it. Capxul stays on pnpm workspaces until it moves onto Architect; Nx works on top of pnpm workspaces, so that move can
be gradual.

## 11. The developer experience, end to end

> The code in this section is the first sketch. The current, exact version of every file is in the Architect Docs
> walkthrough (names from paths, never strings; roles in their thing; the server generated).

**Proposed.** A walk-through with an example app, `acme`, and one thing, the invitation. There are two command lines:
`architect`, the developer's tool, and `acme`, the app's own CLI that Architect generates.

### Step 1: a new project

```text
$ npx create-nx-workspace acme --preset=@architect/preset
```

You get the layout of section 2 with nothing declared yet: `architect.config.ts`, an empty blueprint with two
environments (`local`, `test`), an empty server, the generated SDK, CLI, docs and portal (all empty but working), CI,
git hooks, and Nx's task pipeline (generate, then build, then check, then prove). `architect check` passes;
`nx serve portal` shows an empty blueprint.

### Step 2: a thing

```text
$ architect add thing invitation
```

```ts
// blueprint/things/invitation/thing.ts
export const Invitation = Blueprint.thing("invitation", {
  id: InvitationId,
  email: Email,
  invitedBy: PersonId,
})
```

```ts
// blueprint/things/invitation/machine.ts
export const machine = Blueprint.machine(Invitation, {
  start: "pending",
  states: ["pending", "accepted", "declined", "expired"],
  moves: {
    accept:  { from: ["pending"], to: "accepted", emits: InvitationAccepted },
    decline: { from: ["pending"], to: "declined", emits: InvitationDeclined },
    expire:  { from: ["pending"], to: "expired",  emits: InvitationExpired },
  },
})
```

```ts
// blueprint/things/invitation/errors.ts
export class InvitationNotPending extends Blueprint.error("InvitationNotPending", { state: InvitationState }, { exit: 3 }) {}
```

The portal now has an invitation page: its fields, its machine drawn as a diagram, and no operations yet.

### Step 3: an operation

```text
$ architect add operation invitation.accept
```

```ts
// blueprint/things/invitation/verbs/accept.ts
export const accept = Blueprint.operation(Invitation, "accept", {
  payload: { invitation: InvitationId },
  answer: { member: MemberId },
  moves: machine.moves.accept,          // so InvitationNotPending is refused from every other state, by construction
  errors: [InvitationNotFound],
  allowed: [Roles.invitee],             // anyone else: NotAllowed, generated
  steps: [Step.database("invitation.accept.read"), Step.database("invitation.accept.write")],
  budget: { p95: "300 millis" },        // a target, never a failure
})
```

```ts
// implementation/handlers/invitation/accept.ts: the one hand-written part, a stub that fails until written
export const accept = Handlers.invitation.accept(({ invitation }) => Effect.die("not written yet"))
```

`architect generate` (or Nx's sync, before any task) then writes, under `generated/`:

- **server:** the route, the payload and answer schemas, the typed errors with exit codes, the role check, a span per
  declared step, and the machine's `step` function and its database constraint;
- **SDK:** `acme.invitation.accept`;
- **CLI:** `acme invitation accept`;
- **docs and portal:** the operation's page, marked **unproven**.

### Step 4: a journey

```ts
// blueprint/journeys/invite-and-accept.ts
export const inviteAndAccept = Blueprint.journey("invite and accept", {
  cast: { owner: Roles.owner, olga: Roles.invitee },
  steps: [
    step("owner invites olga", (s) => s.owner.invitation.send({ email: s.olga.email })),
    step("olga accepts", (s) => s.olga.invitation.accept({ invitation: s.last.invitation }),
      expect((answer) => answer.member).toBeDefined()),   // a value check: this operation's own eval
    step("olga can't accept twice", (s) => s.olga.invitation.accept({ invitation: s.first.invitation }),
      refuses(InvitationNotPending)),
  ],
})
```

```text
$ architect prove --env local
```

It runs the journeys in the environment, collects the telemetry, runs every eval and prints each operation's result.
In CI, the same run on a pull request writes verdicts for `test` to the logbook, and the portal shows them.

### The built-in evals, from the declarations alone

Every operation gets these without writing anything:

1. **Answer shape:** the answer decodes with its declared schema.
2. **Declared errors only:** every refusal is a declared error, with its exit code; nothing undeclared escapes.
3. **Machine path:** every move starts from a state it may start from; the thing's events form a path through its
   machine.
4. **Events:** each move emits its declared event, carrying what the declaration says, and nothing undeclared.
5. **Who may call:** a caller without a role is refused with `NotAllowed`.
6. **Steps:** a span for the operation and for every declared step whose path ran; a refusal has its deciding log.
7. **Performance:** p50 and p95 against the budget, per environment. Over 1.5 times the budget raises a review, and
   never fails.
8. **Coverage:** every declared move, error and outcome is reached by some journey.
9. **Explainability:** the share of each call's time that its declared steps account for.

What you write per operation: value checks (`expect`) and refusals (`refuses`) in journeys.

### Step 5: the CLI and the SDK in use

```text
$ acme login
$ acme use test
$ acme invitation accept --invitation inv_123
member: mem_456
$ acme invitation accept --invitation inv_123 --json
{"error":"InvitationNotPending","state":"accepted"}      # exit code 3, from the declaration
$ acme invitation accept --help                          # generated from the declaration and its docs
```

```ts
import { Acme } from "@acme/sdk"

const program = Effect.gen(function* () {
  const acme = yield* Acme
  const { member } = yield* acme.invitation.accept({ invitation })
  //  Effect<{ member: MemberId }, InvitationNotPending | InvitationNotFound | NotAllowed, Acme>
})
```

The SDK is an Effect service: every call is typed with its payload, answer and exact errors, traced with the declared
spans, and pointed at an environment by a layer.

### Step 6: a change

You add a field to `accept`'s payload:

1. You edit one file: `verbs/accept.ts`.
2. `generate` updates the server's schema, the SDK and the CLI's `--role` flag.
3. The handler no longer type-checks until it handles the new field.
4. `check` and Nx's "affected" show what is touched: the server, the SDK, the CLI, and the journey `invite and accept`.
5. In the portal, `invitation.accept`'s verdicts turn **stale**: their evidence was for the old declaration.
6. CI re-runs the affected journeys; when they pass, fresh verdicts replace the stale ones.

When Architect adds something new, say a new built-in eval, existing operations that don't meet it go on a ratchet
that can only shrink, and the portal shows that list.

## 12. Who: principals, roles and people

**Proposed.** Section 3's "Role" is not enough on its own. Architect needs two primitives, and the people themselves
stay the project's:

| Primitive | What it is | Whose |
|---|---|---|
| Principal | Whoever is calling: an identity with a kind (person, agent, service, the system's own clock) | Architect defines it; each environment's identity adapter supplies it |
| Role | A named right, declared once, scoped to a thing: "owner of this company", "invitee of this invitation" | Declared in the blueprint (`roles.ts`), with the rule that decides whether a principal holds it |
| Person, member, director, ... | The application's own nouns about people | The project's things, linked to a principal |
| Cast | The principals a journey runs as, each given its roles | Declared in each journey |

```ts
// blueprint/things/organization/roles.ts
export const invitee = Blueprint.role("invitee", {
  of: Invitation,
  holds: (principal, invitation) => principal.email === invitation.email,   // the rule, written once
})
export const owner = Blueprint.role("owner", {
  of: Company,
  holds: (principal, company) => Members.hasRole(company, principal, "owner"),
})
```

What follows from it:

- **Every operation names its roles** (`allowed`), and the server's one standing check, the `NotAllowed` refusal, the
  built-in "who may call" eval and the docs' "who may call" line are all generated from that.
- **Identity per environment.** `environments.ts` names an identity adapter for each environment: fixed test principals
  locally and in test worlds, real sign-in in production. The CLI's `login` and the SDK's credentials go through it, so
  nothing about identity is hand-written in the CLI.
- **Telemetry** records the caller's principal kind and role on every call, from the declaration.
- **Journeys** declare a cast; each member is a principal given roles, and the "who may call" eval runs each operation
  as someone without the role.
- **Agents are principals** of kind `agent`, so an agent's calls are checked, traced and audited like a person's.

**Open.** 12.1: Roles scoped to a thing, decided by a rule (relationship-based, as above), or plain global roles?
Proposed: scoped; Capxul's rights are all "of this company" or "of this invitation". 12.2: Does Architect ship the
identity adapters (test keys, a sign-in provider), or only their interface? Proposed: the interface plus a test
adapter; real sign-in is the project's choice. 12.3: Are principals' kinds fixed by Architect (person, agent, service,
system) or declared by the project? Proposed: fixed, so the generic evals and telemetry can rely on them.

## 13. Auth, infrastructure and the starter application

- **Decided** (Aaron, 16 November 2026). Architect is opinionated in the way Aaron writes applications.
- **Decided.** Auth is built in, with **Better Auth** as the default. **Proposed:** Better Auth is section 12's identity
  adapter. Its session gives the principal; its organisation plugin holds memberships, which scoped roles' rules read;
  its API keys cover agents and services; its device authorisation flow is the CLI's `login`. Test environments seed
  fixed principals through it.
- **Decided.** Infrastructure is declared in the blueprint and deployed with **Alchemy**. The environments (local, test,
  staging, production) are blueprint declarations, and `generated/infra` holds the Alchemy stacks for each.
  **Proposed:** test environments are created and destroyed as one unit, with an owner and an expiry, as Capxul's worlds
  are (`capxul-next`, AGENTS.md "Worlds" and the roadmap's lifecycle rules), so every pull request can prove itself in a
  fresh one.
- **Decided.** The starter application must be good enough to build a real project on: everything every project
  needs.

**Proposed** contents of the starter, what the preset gives before you declare anything:

1. **Health:** `health` and `version` operations, with their journeys, proven from the first commit.
2. **Auth:** sign up, sign in, sign out, the current principal (`me`), sessions and API keys, through Better Auth; the
   CLI's `login`, `logout` and `use <environment>`.
3. **People and organisations:** a person thing, an organisation thing and a membership with roles (owner, member), as
   real blueprint things with machines, so scoped roles work from day one.
4. **Infrastructure:** the four environments declared, with Alchemy stacks for local and test; staging and production
   ready to fill in.
5. **Telemetry:** every operation traced from its declared steps and exported through OpenTelemetry to a sink named in
   config.
6. **Proof:** CI that runs `check` on every pull request and `prove` in a fresh test environment, writing verdicts to
   the logbook; the portal showing them.
7. **One example thing,** with an operation and a journey, as a pattern to copy; deletable.

**Open.** 13.1: The default cloud and database. Proposed: Cloudflare Workers for the server and Postgres on Neon, as
Capxul runs, with Alchemy providers for both. 13.2: The default telemetry sink. Proposed: Axiom, as Capxul uses; any
OTLP endpoint allowed. 13.3: Are organisations in the starter, or added when needed? Proposed: in it, because scoped
roles need something to be scoped to. 13.4: Where does the logbook run for a new project: one shared service, or each
project its own through its infra? Proposed: each project deploys its own, as part of its infra.

## 14. Why it exists: the blueprint is for the agents that build

- **Decided** (Aaron, 16 November 2026). The blueprint generates code, but it is equally for the agents themselves. It
  is the planning tool: the plan is made in it, and the climb (bringing old work up to the blueprint) is driven from it.
- **Decided.** Architect is used inside the building pipeline. For one agent doing one task, it generates the starting
  code and the context: exactly where everything it needs is, and exactly what it must do.

**Proposed**, how that works:

1. **A task is a blueprint change.** "Add `invitation.accept`", "give `budget` a machine", "bring `org.create` off
   ratchet R18". Each task names the declarations it adds or changes. The plan (goal, milestones, tasks; Aaron's yes to
   "the roadmap's tables generated from a plan declared in the blueprint") is itself declared, so the plan and the
   blueprint can't disagree.
2. **`architect task start <task>`** does two things:
   - **Scaffolds:** writes the declaration change and the failing stubs it implies: the handler that fails until
     written, and the journey steps that fail until the handler is right.
   - **Writes the agent's context:** one generated brief for that task. It covers what to change and in which files;
     the declarations it touches and everything that depends on them; the evals that must pass and in which
     environment; the ratchets it may lower and must not raise; what it must not touch (for a builder: the journeys and
     the generic evals); and the commands to check itself.
3. **The agent works only against that context,** and `architect check` and `prove` tell it, in the same terms, what is
   still wrong.
4. **A task is done when its evals pass,** proven by a verdict in the logbook. Not when the agent says so.
5. **The climb is a queue.** Every entry on a ratchet is a ready-made task (one operation, one gap, one context), so
   "help climb" means taking the next entries, each with its own scaffold and context.

The same contexts serve any agent: Claude Code, Codex, or a Pi agent later.

## 15. The blueprint's durable state

- **Decided** (Aaron, 16 November 2026). The blueprint must be durable state: easy to read and write, always correct,
  and always current. The portal, agents and tools connect to its latest state.

**Proposed**, keeping the decision that state is not in git while declarations are:

- **The source stays code:** declarations are Effect files in the repository, reviewed by pull request, because that
  is what makes them typed, diffable and checkable.
- **The model is durable state.** On every commit that passes `check`, Architect compiles the blueprint into its model
  (the graph of things, operations, machines, events, errors, roles, journeys, evals and environments, and the
  dependencies between them) and publishes it, keyed by revision and branch, to the project's logbook. It is always
  correct because only a model that passed `check` is ever published.
- **The live view joins the two:** the model at a revision, plus the evidence and verdicts for it, plus the plan's state.
  That is what the portal reads, and what agents query (`architect show`, `architect context`, and an MCP later),
  without cloning or parsing code.
- **Writes go through code:** an agent or the portal asks for a change; it becomes an edit to the declaration files,
  checked and reviewed; on merge, the new model is published. Branches get their own model, so a plan can be previewed
  before it lands.

- **Decided** (Aaron, 16 November 2026). Code is the source; the compiled model is the durable state everyone reads.

**Proposed**, how and where it is stored. It is the logbook (`docs/design/state-store.md` in `capxul-next`), extended
to hold the blueprint's model as well as evidence:

- **Where:** the project's logbook, a Cloudflare Worker that each project deploys through its own `generated/infra`
  (section 13).
- **The model files:** each compiled model is one JSON document, named by the hash of its content, stored in R2. It is
  immutable: the same blueprint always compiles to the same file, and a revision never changes after it is published.
- **The index:** one Durable Object per project, backed by SQLite, holds which model each branch and revision points
  to. It also holds the latest model of each branch broken out into tables (things, operations, machines, moves,
  events, errors, roles, journeys, evals, environments, and the dependencies between them), so questions like "which
  journeys use this operation" or "what depends on this thing" are one query. The asks and their answers live here
  too.
- **The evidence:** the logbook's per-run Durable Objects hold the run records and verdicts, keyed by revision, operation
  and environment. The index joins them to the model.
- **Who writes:** only CI. After `architect check` passes on a push, a CI step sends the compiled model with GitHub's
  OIDC token. The Worker checks the token (this repository, this branch, this workflow), stores the file and moves the
  branch's pointer, in one transaction. So nothing that didn't pass `check` is ever published, and nobody can write a
  model by hand.
- **Staleness, computed on publish:** the Worker compares the new model with the branch's previous one. Every
  operation whose declaration changed, or one of whose dependencies changed, has its verdicts marked stale for the new
  revision.
- **Who reads:** the portal and agents, through the logbook's API (itself declared with Architect, so it has its own
  SDK and CLI): the blueprint of a branch, one operation with its evidence, the dependents of anything, what is stale.
  The Durable Object pushes changes to open portals over a WebSocket, so the portal updates itself.
- **Locally:** the same Worker runs on your machine (Alchemy's local runtime), and `architect show` can always compile
  the model straight from the code, so nothing depends on being online.

- **Decided** (Aaron, 16 November 2026). The portal is read only for now, with one exception: answering the questions
  that are waiting on a person.
- **Proposed:** a question is a primitive, the **ask**: raised by an agent or the pipeline while working a task, with
  its context, two to four options with their trade-offs, and a recommendation (the shape the sitrep spike already
  declares, `spikes/sitrep/src/things/ask.ts` in `capxul-next`). The portal lists the open asks and records the answer,
  in the logbook, against the task. An answer that changes a decision becomes a dated decision through the usual review.
