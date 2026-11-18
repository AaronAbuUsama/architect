# K1: building on Architect, start to finish: today and proposed (a 📐 design brief)

Written by the conductor on 17 November 2026, from a long conversation with Aaron about stage 4 (kits: wallets,
chain). **This file is the whole context.** The session that picks it up has seen none of that conversation. Read
it top to bottom; every claim about today cites code on `origin/layer/3`. Everything marked 🆕 is a proposal made in
that conversation, not yet decided. Your job is to decide it (section 9).

Legend: ✅ works today · 🆕 proposed here · ❓ open, with options.

## 0. What Aaron is asking for, in his words

- "What exactly is a kit? How does a kit interact with the rest of the blueprint and Architect? What says what you get
  in each target, what goes on the server? MCP, CLI, SDK: how is that supposed to work across projects? Is it inside
  the blueprint of the kit, or something your application is supposed to expose?"
- "Creating a wallet is inherently client side. Plus we have different deployment and publishing. Where do you even
  declare where things run?"
- On `expose: { mcp: false }`: "Why would you not just say what environments get what?"
- "We've got authentication built in as a first-class thing. How does that affect the design space?"
- "I want to see the DX of everything, tutorial style, start to finish, from the perspective of someone building on
  this." And: "Should we not have a generator for creating these?"

The answer must be a builder's tutorial that is true end to end, plus the framework decisions it forces.

## 1. The primitives (✅ all exist)

| Primitive | Declared in | One line |
|---|---|---|
| value | `blueprint/values/<x>.ts` | a named type: `Amount`, `Memo` |
| thing | `blueprint/things/<t>/thing.ts` | a record with fields: `Allowance` |
| machine | `…/<t>/machine.ts` | the thing's states and the moves between them; each move emits an event |
| event | `…/<t>/events.ts` | what a move emits: `AllowanceSpent` |
| error | `…/<t>/errors.ts` | a refusal carrying data: `AllowanceExceeded` |
| role | `…/<t>/roles.ts` | who a signed-in person is to a thing: `grantee` |
| operation / read | `…/<t>/verbs/<v>.ts` | a verb: payload, answer, errors, `allowed`, steps, move, budget |
| starting world | `blueprint/starting-worlds/<w>.ts` | data a journey starts from, made by running real operations |
| journey | `journeys/<j>.ts` | a story that proves operations; written by an author, never the builder |
| environment | `blueprint/environments/<e>.ts` | where it runs, its identity, database, telemetry, deploys, publishes |
| config | `architect.config.ts` | the app's name, its outputs, its auth |
| handler | `src/<t>/<v>.ts` | the code; scaffolded once by `generate`, yours after |

Names come from paths and exports: a declared name is never a string outside `generated/` (AGENTS.md).

## 2. Today, in code (origin/layer/3)

**The app config** (`examples/acme/architect.config.ts`):

```ts
export default Blueprint.config({
  name: "acme",
  outputs: { server: true, api: true, sdk: "@acme/sdk", cli: "acme", docs: true, mcp: true, portal: true },
  auth: Auth.betterAuth({ organizations: true, apiKeys: true, deviceLogin: true, oauthProvider: true }), // agents sign in to the MCP server
});
```

Auth already knows four ways in: a browser session, an API key, device login (the CLI) and OAuth (agents on MCP).

**An operation** (`examples/acme/blueprint/things/allowance/verbs/spend.ts`):

```ts
export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend, errors: [AllowanceExceeded], allowed: [grantee],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", budget: { p95: "150 millis" },
});
```

**Where it runs.** `packages/blueprint/src/modules/operations/types.ts:22` has `type Runs = "client" | "server" |
"chain"`; `:49` says only `server` is accepted until a target supports another; `operations/service.ts:72` defaults it.
Steps are `"database" | "wait" | "sync" | "check" | "prove"` (`types.ts:19`): no service step.

**Who may call it.** A role is a rule over the thing and the principal (`roles/types.ts:18`). The principal is
`anonymous` or `person` (`roles/types.ts:6-8`), **with no record of how it arrived**: session, key, CLI and agent are
all just `person`. The runtime checks `allowed` before a handler runs (`packages/target-effect/src/modules/access/
service.ts:59-82`). Built-ins: `Blueprint.anyone`, `signedIn` (`roles/types.ts:30`). Each environment picks identity:
`Identity.testPrincipals` or `Identity.betterAuth` (`identity/types.ts:5`).

**Which surfaces exist.** Per environment, fixed names (`environments/types.ts:25-26`): `deploy: { server, mcp,
portal }`, `publish: { sdk, cli }`. Every operation reaches every surface: the renderers in
`packages/generators/src/modules/render/internal/{api,sdk,cli,mcp,server,docs}.ts` each take all of
`model.operations`.

**Journeys** run over HTTP against a local world (`packages/prove/src/modules/journeys/internal/world.ts:1`).

**Commands.** `architect add thing|operation|read|journey <name>` writes files with `Blueprint.todo` gaps and never
overwrites (`packages/cli/src/modules/add/README.md`, templates in `add/internal/templates.ts`). Also `generate`,
`check`, `build`, `dev`, `prove --env`, `promote --to`, `publish --dry-run|--local`, `watch --env`, `impact`, `brief
<thing>.<verb>`, `model`, `telemetry view|stop|trace|open`, `worlds reap`. There is no `create`, `add kit`, `add
service`, `add environment` or `new kit`.

**Generated today** for acme (`examples/acme/generated/`): `model/{model,edges}.json` (45 edges: refers, reads,
acts-on, emits, allowed-by), `server/{main.ts,wrangler.jsonc,migrations}`, `api/src/<t>/<v>.handler.ts` (handler
types), `sdk/src/<t>/<v>.ts` + `client.ts`, `cli/src/main.ts` (`acme <thing> <verb> --<field>`), `mcp/src/index.ts`,
`docs/<t>/…`, `portal/{main.ts,blueprint.json}`.

## 3. The tutorial: building acme, start to finish

Each step: the command, what it does, what it writes, and today versus proposed.

### Step 1 · Start a project 🆕

```bash
pnpm create architect acme
cd acme && pnpm install
```

Proposed: no questions asked; it writes a project that already proves, so minute one is green.

```text
acme/
  architect.config.ts            name, outputs, auth (testPrincipals locally)
  package.json                   pinned @architect/* and effect
  AGENTS.md                      the rules for agents, pointing at .agents/skills/
  .agents/skills/                🧭 wayfinder · 📐 specifier · ✍️ author · 🔨 builder (section 7)
  blueprint/
    things/system/thing.ts
    things/system/verbs/health.ts
    environments/local.ts        runs on this machine, testPrincipals, local D1, local telemetry
    environments/test.ts
    starting-worlds/empty.ts
  journeys/health-is-up.ts
  src/system/health.ts           Effect.succeed({ status: "ok" })
  generated/                     written by the first generate
```

Then it runs `architect generate` and `architect prove --env local`, which prints one journey passed. ✅ today the
same files exist in acme (`examples/acme/blueprint/things/system/`, `journeys/health-is-up.ts`) but were made by hand.

### Step 2 · Add a thing ✅ (🆕 flags)

```bash
architect add thing allowance
```

✅ Writes six files, every gap a `Blueprint.todo` that compiles and that `check` names: `thing.ts` (an `id` field),
`machine.ts` (states todo, no moves), `roles.ts` (a `holder` role, rule todo), `events.ts`, `errors.ts`,
`values/allowance.ts`.

🆕 Optional flags so the first draft is closer: `--fields limit:Amount,spent:Amount --states
active,exhausted,revoked`.

### Step 3 · Add verbs, each a move 🆕 (✅ without `--move`)

Today `architect add operation allowance.spend` writes only `verbs/spend.ts`, and you wire the machine and event by
hand. Proposed: a verb that changes state *is* a move, so one command writes all three:

```bash
architect add operation allowance.grant  --move "→active"
architect add operation allowance.spend  --move "active→active|exhausted"
architect add operation allowance.revoke --move "active|exhausted→revoked"
architect add read allowance.get
```

It edits `machine.ts` (adds the move), `events.ts` (adds `AllowanceSpent` with todo fields) and writes `verbs/spend.ts`
with `move: machine.moves.spend` already wired. One file per verb stays (diffs, `impact` and names-from-paths rely on
it). ❓ Alternative: declare all verbs in one file per thing (`Blueprint.verbs(machine, { spend: {…} })`).

### Step 4 · Fill in the declarations ✅

You (or the 📐 specifier) replace the todos: fields, the payload and answer, errors, `allowed: [grantee]`, steps,
budget. `architect check` lists what is still blank, file and line. 🆕 `architect check --ready` fails while any
`Blueprint.todo` or `Blueprint.question` remains, so "ready to build" is a check, not an opinion.

### Step 5 · Generate ✅

```bash
architect generate
```

Writes, per operation (for `allowance.spend`):

```text
generated/model/model.json, edges.json          hashes, edges
generated/api/src/allowance/spend.handler.ts    the Handler type: payload in, answer or declared errors out
generated/server/main.ts                        the route, auth, roles check, idempotency, telemetry
generated/sdk/src/allowance/spend.ts            acme.allowance.spend({ … })
generated/cli/src/main.ts                       acme allowance spend --allowance … --amount …
generated/mcp/src/index.ts                      the allowance_spend tool
generated/docs/allowance/…                      the reference page
generated/portal/blueprint.json                 the portal's data
src/allowance/spend.ts                          scaffolded once: "Yours from now on."
```

🆕 With section 4 in place, which of these an operation appears in depends on `runs` and `allowed`.

### Step 6 · Journeys first ✅

A ✍️ author (a different agent from the builder) writes the journey and any starting world:

```bash
architect add journey spend-within-allowance
```

```ts
export default Blueprint.journey("spend within an allowance", {
  cast: { olga: grantee }, starts: "funded",
  steps: (s) => [
    s.step("olga spends some", s.olga.run(spend, { allowance: s.world.allowance, amount: 120n, memo: "train" }),
      expect((a) => a.remaining).toBe(380n), emits(AllowanceSpent, { … }), machine.isIn(s.world.allowance, "active")),
    s.step("olga can't spend more than is left", s.olga.run(spend, { …, amount: 400n }),
      refuses(AllowanceExceeded, { remaining: 380n }), noEvents()),
  ],
});
```

The `funded` world is made by running `grant`, never by writing rows. `architect prove --env local` now fails: the
handler is empty. That failure is the builder's starting line.

### Step 7 · Build ✅

```bash
architect brief allowance.spend     # the builder's brief: the declaration, its journeys, its rules
```

The 🔨 builder writes `src/allowance/spend.ts` in Effect: load, refuse with `AllowanceExceeded`, record, `move(…)`. Then
`architect check` (rules: declared errors only, no names as strings, refusals logged) and `architect prove --env local`
(verdicts into the logbook). `architect telemetry view` shows the traces.

### Step 8 · Use it, from every surface ✅

```ts
const acme = client({ url, token });                       // SDK, with a session or an API key
await acme.allowance.spend({ allowance, amount: 120n, memo: "train" });
```

```bash
acme login                                                 # device login
acme allowance spend --allowance alw_… --amount 120 --memo train
```

An agent signs in to the MCP server by OAuth and sees the `allowance_spend` tool. The portal at `/portal` shows spend as
proven on local.

### Step 9 · Environments, ship, watch ✅ (🆕 `add environment`)

```bash
architect add environment staging      # 🆕 today you write blueprint/environments/staging.ts by hand
architect promote --to staging         # re-proves there before it counts
architect publish --dry-run            # the SDK and CLI to npm
architect watch --env staging          # drift from real traffic becomes a task in .architect/tasks/
architect impact                       # what a change made stale
```

### Step 10 · Add a kit 🆕 (all of this step is proposed; section 5)

```bash
architect add kit @architect/kit-wallets
architect generate
architect prove --env local            # acme's journeys plus the kit's, in acme's worlds
```

`blueprint/kits/wallets.ts` is written; `wallet.create` (runs on the device), `wallet.link` (server) and the `Signer`
service appear; acme's own handler can call `Signer.signMessage` as a step. Upgrading the kit changes its declarations'
hashes, and `architect impact` names exactly which acme operations went stale.

## 4. Where it runs, who may reach it, which surfaces exist 🆕

The conversation's main finding: these are three different questions, and each belongs in one place. `expose: { mcp:
false }` was wrong because it mixed them.

| Question | Answered by | Declared in |
|---|---|---|
| Where does the code run? | `runs: "client" \| "server" \| "chain"` (+ `"actor"` later) | the operation |
| Who may reach it, by what kind of credential? | `allowed`, with the credential kind | the operation |
| Which surfaces and credential kinds exist in this environment? | `deploy`, `publish`, `identity` | the environment |

### 4.1 Credential kind becomes part of the principal (exposure is authorization)

```ts
// packages/blueprint/src/modules/roles/types.ts, proposed
export type Via = "session" | "key" | "device" | "agent";      // browser, API key, CLI device login, MCP OAuth
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly via: Via };
```

Better Auth already issues all four (`architect.config.ts`: `apiKeys`, `deviceLogin`, `oauthProvider`); the runtime
only has to record which one it verified. Roles gain one combinator:

```ts
allowed: [grantee]                                  // any way in (the default: acme is unchanged)
allowed: [Blueprint.signedIn.via("session", "device")]   // people only
allowed: [grantee.notVia("agent")]                  // anyone but agents
```

The runtime enforces it (`access/service.ts`), so an agent token calling the HTTP route directly is refused too.
Hiding a tool from MCP alone would not be security.

### 4.2 The generation rule

| Target | Gets an operation when |
|---|---|
| server | it `runs: "server"` (and every inbound entry, section 5.3) |
| SDK | some allowed role admits `session` or `key`; a `runs: "client"` op is local code, a server op an HTTP call |
| CLI | some allowed role admits `device` or `key`; client ops run in the CLI process |
| MCP | some allowed role admits `agent`, and it does not run on the client (an agent has no device) |
| docs, portal | always, marked with where it runs and who may reach it |

### 4.3 The environment says what exists (Aaron's "what environments get what")

```ts
// blueprint/environments/production.ts
export default Blueprint.environment({
  identity: Identity.betterAuth({ via: ["session", "key", "device"] }),   // 🆕 no agents in production yet
  deploy: { server: Deploy.worker({…}), portal: Deploy.site({…}) },        // so no mcp deploy
  publish: { sdk: Deploy.npm({…}), cli: Deploy.npm({…}) },
});
```

`architect check` fails if an environment deploys MCP but its identity admits no agents, or the other way round.
Turning agents on in production is one line in one file, and the portal shows it.

### 4.4 Options considered for "who may reach it"

| Axis | A · override on the kit mount (`expose`) | B · one allow-list file per surface | C · an audience field `for: [...]` | **E · credential kind in `allowed`** |
|---|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ | ✅ one field on the principal |
| Reversibility | ✅ | ✅ | ✅ | ✅ |
| Blast radius | ⚠️ surface names in every op | ⚠️ every new op edits lists | ✅ | ⚠️ identity, roles, MCP OAuth |
| Correctness | ⚠️ hiding only | ✅ allow-list | ⚠️ second auth system beside `allowed` | ✅ enforced at runtime |
| Fit | ❌ names as strings | ⚠️ second place to edit | ⚠️ | ✅ uses first-class auth |

Recommendation from the conversation: **E**. B's strength (one place to see "what can agents do") becomes a generated
view: `architect model --surfaces` and a portal page.

## 5. Kits 🆕

### 5.1 What a kit contributes (tested on six)

| Kit | People call | Agents | Calls *you* | Your handlers call | Runs |
|---|---|---|---|---|---|
| wallets | create, link | link, never create | no | Signer | device; server for link |
| chain (viem) | no | no | chain events | contracts, transactions | server, actor |
| payments (Stripe) | checkout | maybe | Stripe webhooks | refund | server |
| email (Resend) | no | no | bounces | send | server |
| auth (Better Auth) | sign-up, sign-in | no | OAuth callbacks | who is this | server; every op depends on it |
| erc20 / safe | transfer | yes | transfer events | yes | chain, server, actor |

Four kinds: (1) operations, exposed by section 4's rule; (2) **services** handlers call, no surface; (3) **inbound
entries** that are not operations (webhooks, OAuth callbacks, chain events), server only; (4) **runtime pieces**
(identity, relayer, follower, keeper).

### 5.2 A kit is a blueprint fragment, mounted (option B of four)

Options weighed: A services only (every app re-declares and re-proves the operations); **B a mounted fragment**; C its
own deployed service (two deployments, roles across apps); D copied in (every app forks). B was recommended, with A as
its special case (email is a kit with services and no operations).

A kit's package has the same layout as a project:

```text
@architect/kit-wallets/
  kit.ts                               the manifest
  blueprint/things/wallet/{thing,machine,events,errors,roles}.ts
  blueprint/things/wallet/verbs/{create,link,get}.ts
  blueprint/services/signer.ts
  blueprint/starting-worlds/linked.ts
  journeys/create-and-link.ts
  src/wallet/{create,link}.ts          handlers
  src/services/signer/{test-keys,local,passkey}.ts
  example/                             a tiny app that mounts it, where the kit proves itself
```

```ts
// kit.ts
export default Blueprint.kit({
  description: "Wallets a person holds on their own device, linked to their account.",
  choices: { keystore: Blueprint.choice(["test-keys", "local", "passkey"]) },
  needs: { chain: Blueprint.needs("@architect/kit-chain") },
});
```

```ts
// acme: blueprint/kits/wallets.ts, written by `architect add kit`
import wallets from "@architect/kit-wallets";
export default Blueprint.use(wallets, {
  choices: { keystore: { local: "test-keys", test: "test-keys", staging: "local", production: "passkey" } },
  allowed: [[wallets.verbs.link, [member.via("session", "device")]]],   // tighten, by reference, never by string
});
```

Names fold under the kit's things (`wallet.create`); a clash with an app thing fails `check`, fixed with `as:`.

### 5.3 Services and inbound entries

```ts
// kit: blueprint/services/signer.ts
export const Signer = Blueprint.service("signer", {
  runs: "client",
  methods: {
    address: { payload: {}, answer: { address: Address } },
    signMessage: { payload: { message: Text }, answer: { signature: Signature }, errors: [KeyLocked] },
  },
  implementations: ["test-keys", "local", "passkey"],      // chosen per environment through the mount's choices
});
// app: a step that uses it
steps: { sign: Blueprint.step.service(Signer.signMessage), record: Blueprint.step.database() },

// payments kit: blueprint/inbound/stripe.ts
export const stripe = Blueprint.inbound({ path: "/stripe", verify: Stripe.signature, handles: [CheckoutCompleted] });
```

New model edges: `runs-in`, `uses-service`, `from-kit`, so `impact` and `architect model --graph` (mermaid from
`edges.json`) see them.

### 5.4 Across projects

The kit is versioned and proves itself once in its own `example/`. Each app mounts it with its own choices and
tightening, and `architect prove` re-runs the kit's journeys in the app's worlds with the app's roles. An upgrade
changes hashes, and `impact` names what went stale.

### 5.5 Authoring a kit

```bash
architect new kit wallets            # 🆕 the layout above, with example/ already proving a health journey
architect add service signer         # 🆕
architect add inbound stripe         # 🆕
```

Auth is the proving kit: it is built in today and has all four kinds of contribution. Moving it into a kit before
wallets proves the mechanism on something real.

## 6. Journeys, in this world ❓

- A kit ships journeys; mounting re-runs them in the app.
- A `runs: "client"` operation needs the journey runner to act as a client (today it only calls over HTTP,
  `prove/src/modules/journeys/internal/world.ts`). Proposed: the runner loads the generated SDK and the `test-keys`
  implementation, in node.
- Proposed assertion: `refusesVia("agent", wallet.create)` to prove an agent is refused.

## 7. The design loop: idea to ready-to-build 🆕

| Step | Who | Artifact | Done check |
|---|---|---|---|
| idea → options | 🧭 wayfinder | `Blueprint.question("…", { options, answeredBy: "spikes/x" })` in the blueprint | the question compiles and shows in the portal |
| questions → answers | 🧪 spike | `spikes/<x>/README.md` | the question is replaced by a declaration |
| answers → declarations | 📐 specifier | blueprint files, `kit-<x>/references/` | `architect check --ready` |
| declarations → journeys | ✍️ author | `journeys/`, `starting-worlds/` | `prove` fails on empty handlers |
| journeys → code | 🔨 builder | `src/` from `architect brief <op> --spec` | `prove` passes |

## 8. What this asks of the framework, in build order

1. The principal records `via`; roles get `.via()` / `.notVia()`; identity takes `via: [...]` per environment.
2. Renderers filter by section 4.2's rule; `check` cross-checks deploys against identity.
3. `runs: "client"` accepted; the SDK and CLI render client operations as local code (needs a `spikes/runs-client`
   spike first).
4. `Blueprint.service`, `Blueprint.step.service`, `Blueprint.inbound`.
5. `Blueprint.kit`, `Blueprint.use`, namespacing, kit journeys in app worlds.
6. Generators: `create architect`, `add operation --move`, `add environment`, `add kit`, `new kit`, `add service`,
   `add inbound`; `model --graph`, `model --surfaces`; `check --ready`, `Blueprint.question`.
7. Auth as a kit. Then wallets, then chain (Gate 3: "acme adds wallets and chain kits").

## 9. The prompt for the design session

```text
You are a 📐 Designer for Architect. Read AGENTS.md, .agents/skills/threads/SKILL.md ("Talking to Aaron"), then
design/briefs/K1-kits-and-surfaces.md in full: it is your only context for a long conversation you did not see.
Then design/build-plan.md (layer 3 and D4), design/decisions/N1-noir-target.md, and the code K1 cites on
origin/layer/3. Codex is building on layer/3: never touch layer/* or packages/.

Decide, with evidence, and record in design/decisions/K1-kits.md:
1. The three-place split of section 4, and E against A, B and C, in real code on the rubric in ~/.claude/CLAUDE.md
   (floor-first, reversibility, blast radius, correctness, parallelizability, fit).
2. Every 🆕 and ❓ in section 3's tutorial: the command, its flags, exactly what it writes.
3. What a kit is (section 5), tested on all six kits in 5.1, not just wallets; services, inbound entries, runtime
   pieces; names and clashes; across projects.
4. Journeys for kits and client operations (section 6); the design loop (section 7).
5. The build order of section 8, as stage-4 steps, each with a done-when check.

Done when the record answers these with code sketches; spikes/kits-dx/ holds the final tutorial as a static page and
a sketch of acme with wallets, payments and email mounted (labelled proposed); questions only Aaron can answer are
batched at the end in the batch-grill format. Work on design/kits-decision from origin/main and land it by a pull
request. Report to Aaron in short spoken sentences.
```
