# The whole journey: building the Plugged In app with Orthograph

Written 19 November 2026 for Aaron, by the walkthrough thread. Every command below was run on `origin/m1` at
`6419d4b7`, unless its badge says otherwise.

## Before we start

This is the developer's story, told in order. You spawn an app. You declare its state. You generate everything. You
fill the handlers. You prove it, run it, and deploy it. Then you add wallets, then more features.

The app is **Plugged In**: a link-in-bio app. A person claims a handle, like `@aaron`, and puts links on a public page.

Each step carries one of four badges. They are honest.

| Badge | What it means |
|---|---|
| 🟢 **Works today** | I ran it on `origin/m1`. The output below is pasted, not typed. |
| 🟡 **Built but unproved** | The code exists, and its tests may pass, but I did not see it work end to end here. |
| 🔵 **Designed only** | A decision or a milestone row says how it will work. No code yet. The row is cited. |
| 🔴 **Hole** | Nothing is designed. Someone has to decide it. |

**Where the blueprint came from.** Plugged In does not exist on `m1` yet. Its folder, `examples/plugged-in`, is
slice M1.40. Codex wrote a draft of it on the branch `links/stage-1` (pull request 56), under its old name, `links`. I
copied that draft onto `m1` and renamed it as K15 says: the folder, the package `@plugged-in/source` and the command
`plugged-in`. Nothing else changed. The walkthrough spike (pull request 78) did the same thing and got the same result.

One thing to know up front. Codex's draft is **more than stage 1**. It already has people, sessions, organisations,
invitations and API keys, copied from the starter, plus handles and links with their handlers filled in. So the
example you see below is further along than M1.40 asks. Where that matters, I say so.

---

## 1. Spawning the app

### What you'd want to type

```bash
npm create orthograph plugged-in
```

🔵 **Designed only** (M2.09, and the K15 name table). M2.09 says `ortho new` replaces the Nx preset, and the app it
makes *is* Plugged In at stage 1, with auth and handles mounted. That needs M2.07 (organisations as a plugin) and
ST1.07 (Plugged In mounts auth). Neither exists. There is no `ortho new`, `ortho init` or `create-orthograph` package
on `m1` today:

```text
$ ortho --help
SUBCOMMANDS
  model, describe
  dev
  prove
  promote
  add
  check
  generate
  brief
  impact
  version
  publish
  build
  env
  worlds
  telemetry
  watch
```

### What works today

🟢 **Works today, but only inside this repository.** The Nx preset makes a new project. Gate 1's check 1 does exactly
this: it publishes Orthograph's packages to a local registry (Verdaccio, run under Node, no Docker), then runs the
preset. I ran that script with the name `plugged-in`:

```bash
ORTHO_E2E_NAME=plugged-in tools/e2e/starter.sh
```

```text
== build
== pack the starter into the preset
== registry on :4893
== publish
published orthograph
published compiler
published language-effect
published chain-evm
published lint
published portal
published projections
published generators
published host-cloudflare
published logbook
published prove
published cli
published preset

== create-nx-workspace plugged-in --preset=@orthograph/preset
✔ Installing dependencies with pnpm
✔ Successfully created the workspace: plugged-in

== ortho check
blanks left 0
types ✔
rules ✔
drift ✔
ratchets 0
check ✔

== ortho prove --env local
journey an invitation is used once ✔ 3/3 steps
journey an owner makes an api key ✔ 5/5 steps
journey health is up ✔ 1/1 steps
journey invite and accept ✔ 11/11 steps
journey sign up and sign in ✔ 5/5 steps
…
coverage ✔ moves 4/4 · outcomes 4/4 · refusals 2/2 · runtime refusals 9/10
prove ✔
```

**The break.** None of `@orthograph/*` is on npm yet. The handoff says the npm preview comes after Gate M1. So outside
this repository, nobody can spawn an app at all today. The command only works because the script publishes every
package to a registry on your own machine first.

**The second break.** What lands is the *starter*, not Plugged In. You get people, sessions, organisations,
invitations and API keys. You get no handle, no link and no profile. The name `plugged-in` is only the folder's name.

### What lands on disk

```text
plugged-in/
  package.json            "@plugged-in/source", bin "plugged-in": ./generated/cli/src/main.ts
  nx.json  pnpm-workspace.yaml  tsconfig.json  README.md  CLAUDE.md
  apps/  libs/            empty (Nx's own folders)
  blueprint/
    environments/         local.ts  test.ts  staging.ts  production.ts
    starting-worlds/      founded.ts  invited.ts
    things/
      api-key/            thing.ts  verbs/create.ts
      invitation/         thing.ts  machine.ts  events.ts  roles.ts  verbs/{accept,revoke,send}.ts
      membership/         thing.ts  roles.ts  verbs/get.ts
      organization/       thing.ts  machine.ts  events.ts  roles.ts  verbs/{create,get}.ts
      person/             thing.ts  errors.ts  verbs/sign-up.ts
      session/            thing.ts  errors.ts  verbs/{show,sign-in}.ts
      system/             thing.ts  verbs/health.ts
    values/identity.ts
  src/                    one handler per operation, already filled
    api-key/create.ts  invitation/{accept,revoke,send}.ts  organization/create.ts
    person/sign-up.ts  session/{show,sign-in}.ts  system/health.ts
  journeys/               an-invitation-is-used-once.ts  an-owner-makes-an-api-key.ts  health-is-up.ts
                          invite-and-accept.ts  sign-up-and-sign-in.ts
  generated/              api  cli  docs  mcp  model  portal  sdk  server
  .ortho/                 local state: prove's database, traces, evidence (ignored by git)
```

Four folders matter, and they are the same in every Orthograph project:

| Folder | Whose it is | What's in it |
|---|---|---|
| `blueprint/` | yours | what you declare: things, machines, operations, errors, roles, events, environments, starting worlds |
| `src/` | yours | the handlers, one per operation. Scaffolded once, then yours |
| `journeys/` | the journey author's | the stories that prove the app works. The builder never edits them |
| `generated/` | Orthograph's | everything that falls out. Every file says `Do not edit` and is rewritten on each generate |

---

## 2. Declaring state: a thing, its fields, its machine

A **thing** is a noun your app keeps: here a handle, a link and a profile. A thing has **fields**. If it has a
lifecycle, it has a **machine**: its states and the moves between them.

### Make a new thing

🟢 **Works today.** `ortho add thing` writes the five files every thing has, with blanks for you to fill. Here it is
for a made-up `bookmark`, dry run:

```text
$ ortho add thing bookmark --dry-run
--- blueprint/things/bookmark/thing.ts
import { Blueprint } from "orthograph";

export const Bookmark = Blueprint.thing({
  description: Blueprint.todo("what a bookmark is, in one sentence"),
  fields: {
    id: Blueprint.id("boo"),
  },
});
--- blueprint/things/bookmark/machine.ts
import { Blueprint } from "orthograph";
import { Bookmark } from "./thing.ts";

// The states a bookmark can be in, and the moves between them. Each move names the event it emits (events.ts).
export const machine = Blueprint.machine(Bookmark, {
  states: Blueprint.todo("the states a bookmark can be in, the first one where it starts"),
  moves: {},
  notFrom: { exit: 40 }, // the exit code when a move can't start from the state it's in
});
--- blueprint/things/bookmark/roles.ts
import { Blueprint } from "orthograph";
import { Bookmark } from "./thing.ts";

// Who a person is to a bookmark. Rename the role to what it means.
export const holder = Blueprint.role(Bookmark, { rule: Blueprint.todo("when a person holds this role on a bookmark") });
--- blueprint/things/bookmark/events.ts
// What happened to a bookmark, one event per move: `export const BookmarkMade = Blueprint.event({ ... })`.
export {};
--- blueprint/things/bookmark/errors.ts
// Refusals that depend on data: `export class BookmarkMissing extends Blueprint.error({ ... }, { exit: 40 }) {}`.
// The machine's own refusal is generated and never written here.
export {};
--- blueprint/values/bookmark.ts
// The values a bookmark's fields are made of: `export const Amount = Blueprint.value(Blueprint.uint(128))`.
export {};
(dry run: 6 files, nothing written)
```

Each `Blueprint.todo` is a blank. `ortho check` lists every blank with its file and line, and fails until they're
filled. Asking for a thing that already exists writes nothing:

```text
$ ortho add thing link --dry-run
already there, so nothing was written: blueprint/things/link/thing.ts, blueprint/things/link/machine.ts, blueprint/things/link/roles.ts, blueprint/things/link/events.ts, blueprint/things/link/errors.ts
(exit 2)
```

### The values

🟢 **Works today.** A value is a field's type, with its rules. Plugged In's are in one file. A handle name is lower
case, starts with a letter, and is at most 32 long. A link's address must be http or https and must parse.

`blueprint/values/links.ts`:

```ts
import { Blueprint, Schema } from "orthograph";

export const HandleName = Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]{0,31}$/)));
export const LinkTitle = Blueprint.value(Blueprint.text({ max: 120 }));
export const LinkUrl = Blueprint.value(Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(/^https?:\/\//),
  Schema.makeFilter((url: string) => URL.canParse(url)),
));
export const LinkPosition = Blueprint.value(Blueprint.uint(32));
```

### The thing: a handle

🟢 **Works today.** `blueprint/things/handle/thing.ts`:

```ts
import { Blueprint } from "orthograph";
import { HandleName } from "../../values/links.ts";
import { Person } from "../person/thing.ts";

export const Handle = Blueprint.thing({
  description: "A public name that belongs to one person until they release it.",
  code: "HN",
  fields: { id: Blueprint.id("hdl"), name: HandleName, owner: Person.fields.id },
});
```

`code: "HN"` is the prefix of every refusal code this thing gives: `HN-001`, `HN-002`. `Blueprint.id("hdl")` makes ids
like `hdl_aaron`. `owner` points at a person's id, so the model knows a handle belongs to a person.

### Its machine

🟢 **Works today.** `blueprint/things/handle/machine.ts`:

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { HandleClaimed, HandleReleased } from "./events.ts";

export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: {
    claim: { from: [], to: "claimed", emits: HandleClaimed },
    release: { from: ["claimed"], to: "released", emits: HandleReleased },
  },
  notFrom: { exit: 5 },
});
```

Two states, two moves. `claim` has no `from`, so it creates a handle. `release` only works from `claimed`. If you try
to release a handle that's already released, the runtime refuses before your code runs, with exit 5. You never write
that check.

The link has the same shape: `listed` and `removed`, with `add` and `remove`. The profile has no machine at all; it's
plain data with a `status` field.

### See what the compiler understood

🟢 **Works today.** `ortho model` (also called `ortho describe`) prints what the compiler read. Each line ends in a
hash. Change a declaration and only its hash moves; that is how Orthograph knows what a change makes stale.

```text
$ ortho model
thing api-key  dec54cf75bd4acb9
thing handle (claimed, released)  91455fb8cfa33c84
thing invitation (pending, accepted, revoked)  7c1d13c393ddaa62
thing link (listed, removed)  3a2c26b144fefb8c
thing membership  e6505be81a7030e4
thing organization (active)  24a71fadb70bce98
thing person  ad771ebabdfe3e0e
thing profile  4918b89e1968d655
thing session  455311c2adae1097
thing system  357767c64efceced
operation api-key.create  refuses NotAllowed  56de0903f4a0f20e
operation handle.claim  refuses HandleTaken, HandleAlreadyOwned, NotAllowed  5040bd430a847bbe
operation handle.release  refuses HandleNotClaimed, NotAllowed  94a4caf880c12e77
operation handle.resolve  refuses HandleNotFound  ad4b5e61f0e03361
operation invitation.accept  refuses InvitationNotPending, NotAllowed  937e15a8f2c9b98a
operation invitation.revoke  refuses InvitationNotPending, NotAllowed  a527002466da0300
operation invitation.send  refuses NotAllowed  2f3b2483d2c752f7
operation link.add  refuses LinkNeedsHandle, NotAllowed  87b4ac441f731c56
operation link.order  refuses LinkAlreadyRemoved, NotAllowed  fc4cb5a4800763c8
operation link.remove  refuses LinkNotListed, NotAllowed  8dbeeeecbb3d2365
operation membership.get  refuses NotAllowed  681858c8967f5976
operation organization.create  refuses NotAllowed  c85baf957d5baae5
operation organization.get  refuses NotAllowed  fa554aa19547e5b1
operation person.sign-up  refuses PersonEmailTaken  e11e9d899807519a
operation profile.get  refuses ProfileNotFound  4a947f542dc7ad93
operation session.show  refuses NotAllowed  4c1f11c0f00cc6e0
operation session.sign-in  refuses SessionCredentialsWrong  64fc31973ed9c65e
operation system.health  refuses nothing  7e17e7bd40ff6ca9
```

### Where it breaks

🔵 **Designed only: a field can't have a description.** A thing has a description; its fields don't. There is no
place in `Blueprint.thing` to say what `owner` means. The K14 grid found this (`FieldModel` has no description), and
M1.41's check expects field descriptions in every output, so M1.42 must add it. K14 proposes the row; it is not in
`milestones.md` yet.

🔵 **Designed only: field visibility on Plugged In.** Visibility (public, private, secret) exists and is enforced
(M1.35, merged on `m1`). But nothing in Plugged In's blueprint uses it yet, and the portal can't show it (M1.42).

---

## 3. Operations, errors, roles and events

An **operation** is something a caller can do: claim a handle, add a link. A **read** is an operation that changes
nothing. An **error** is a refusal you declare. A **role** says who a person is to a thing. An **event** is the record
a move leaves behind.

### The operation: claim a handle

🟢 **Works today.** `blueprint/things/handle/verbs/claim.ts`. The file's path is its name: `handle.claim`.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleTaken, HandleAlreadyOwned } from "../errors.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Handle, {
  description: "Claim a free name and make it the address of your public profile.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  move: machine.moves.claim,
  errors: [HandleTaken, HandleAlreadyOwned],
  allowed: [Blueprint.signedIn],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
```

Read it top to bottom. It takes a name. It answers a handle id. It makes the `claim` move. It can refuse in two
declared ways. Anyone signed in may call it. It has two steps, each a database call, each its own span in the trace.
The same request sent twice is one call. And it should answer within 150 milliseconds, 95 times in 100.

A read looks the same without a move. `blueprint/things/profile/verbs/get.ts` lets anyone read a page:

```ts
import { Blueprint, Schema } from "orthograph";
import { Profile } from "../thing.ts";
import { ProfileNotFound } from "../errors.ts";
import { Handle } from "../../handle/thing.ts";
import { Link } from "../../link/thing.ts";

const PageLinks = Blueprint.value(Schema.Array(Schema.Struct({
  id: Link.fields.id.value.schema,
  title: Link.fields.title.value.schema,
  url: Link.fields.url.value.schema,
})));

export default Blueprint.operation(Profile, {
  description: "Read a claimed name's public profile and its links in display order.",
  payload: { handle: Handle.fields.name },
  answer: { handle: Handle.fields.name, links: PageLinks },
  errors: [ProfileNotFound],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
```

### The errors

🟢 **Works today.** `blueprint/things/handle/errors.ts`. Each class is a refusal with its exit code. The refusal code
(`HN-001`) is given by the compiler, in the order they're declared.

```ts
import { Blueprint } from "orthograph";

export class HandleTaken extends Blueprint.error({}, { exit: 3 }) {}
export class HandleAlreadyOwned extends Blueprint.error({}, { exit: 4 }) {}
export class HandleNotFound extends Blueprint.error({}, { exit: 6 }) {}
```

### The role

🟢 **Works today.** `blueprint/things/handle/roles.ts`. The owner of a handle is the person in its `owner` field.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const handleOwner = Blueprint.role(Handle, { rule: (handle, caller) => handle.owner === caller.person });
```

`handle.release` says `allowed: [handleOwner]`. The runtime checks the rule before the handler runs. A stranger gets
`NotAllowed` and your code never sees the call.

### The events

🟢 **Works today.** `blueprint/things/handle/events.ts`. The machine names which event each move emits. The runtime
writes it to the journal in the same commit as the change.

```ts
import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";

export const HandleClaimed = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
export const HandleReleased = Blueprint.event({ handle: Handle.fields.id, name: Handle.fields.name });
```

### Check it all

🟢 **Works today.**

```text
$ ortho check
blanks left 0
types ✔
rules ✔
drift ✔
ratchets 0
check ✔
```

### Where it breaks

🔴 **Hole: two refusals can share an exit code.** `HandleTaken` is declared with exit 3. The runtime's `NotAllowed`
is also exit 3. So a script calling `plugged-in handle claim` can't tell "that name is taken" from "you aren't signed
in" by exit code. I ran both (chapter 7 shows it): both exit 3. The compiler doesn't refuse the clash, and the
portal's agreed design (`design/portal.md:141`) even draws `HN-001 exit 3` beside `HN-002 exit 3`. K16's M1.47 makes
one refusals table for every surface, but it doesn't forbid two refusals of one operation sharing an exit. Someone
has to decide: refuse the clash at compile time, or reserve exits 1 to 9 for the runtime.

🔵 **Designed only: who may call isn't in the clients.** `allowed` reaches the docs and the server, but not the SDK,
the CLI's help or MCP (K17, "Declared, reaching nothing"; K14). Designed in M1.42 and M2.03.

🔵 **Designed only: a declared refusal isn't typed in the SDK.** The walkthrough spike traced `HandleTaken` and found
it reaches the API, docs, portal, model and scaffold, but not the SDK, CLI or MCP as a type. M1.12 (the SDK contract)
designs it.

🔵 **Designed only: a refusal's fields.** All of Plugged In's errors carry no fields (`Blueprint.error({}, …)`). They
could. K16 gives each field its own blank in the scaffold (M1.44).

<!-- CHAPTERS 4+ -->
