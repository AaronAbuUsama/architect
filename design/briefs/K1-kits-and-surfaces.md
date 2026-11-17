# K1 brief: kits, surfaces and the builder's DX (a 📐 design session)

Written by the conductor, 17 November 2026, from a long conversation with Aaron about stage 4 (kits: wallets, chain).
It holds where the code is today and the candidate future, so a fresh session can design it out. Paste the block at the
end into a new session started in `~/projects/architect`.

Aaron's words, which set the bar: "what exactly is a kit, how does a kit interact with the rest of the blueprint… what
says what you get in each target… what goes on the server… mcp, cli, sdk, how is that supposed to work across
projects… is it inside the blueprint of the kit or is it something your application is supposed to expose." And:
"why would you not just say what environments get what, rather than mcp false." And: "we've got authentication built
in as a first-class thing, so how does that affect the design space."

## 1. Today, in code (origin/layer/3)

**A project.** `examples/acme/blueprint/things/<thing>/{thing,machine,events,errors,roles}.ts` and
`verbs/<verb>.ts`; `starting-worlds/`, `environments/`, `values/`; `journeys/` at the top; handlers in
`src/<thing>/<verb>.ts`, scaffolded once by `architect generate`. Commands that exist: `architect add
thing|operation|read|journey`, `generate`, `check`, `build`, `dev`, `prove --env`, `promote --to`, `publish`, `watch
--env`, `impact`, `brief`, `model`, `telemetry`, `worlds reap`. There is no project generator (`create architect`) and
no `add kit` or `add service`.

**An operation** (`examples/acme/blueprint/things/allowance/verbs/spend.ts`):

```ts
export default Blueprint.operation(Allowance, {
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo },
  answer: { remaining: Amount },
  move: machine.moves.spend, errors: [AllowanceExceeded], allowed: [grantee],
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() },
  idempotent: "request", budget: { p95: "150 millis" },
});
```

**Where it runs.** `packages/blueprint/src/modules/operations/types.ts:22` already declares
`type Runs = "client" | "server" | "chain"`, but `:49` says only `server` is accepted until a target supports another,
and `operations/service.ts:72` defaults to `"server"`. Steps are `"database" | "wait" | "sync" | "check" | "prove"`
(`types.ts:19`): there is no service step.

**Who may call it.** `allowed: [grantee]`. A role is a rule over the thing and a principal
(`roles/types.ts:18`). The principal is `anonymous` or a `person` (`roles/types.ts:6-8`). It says nothing about how
the caller arrived: a browser session, an API key, a CLI token and an agent's MCP OAuth grant all become the same
`person`. Built-ins are `anyone` and `signedIn` (`roles/types.ts:30`). Identity is chosen per environment:
`Identity.testPrincipals` or `Identity.betterAuth` (`identity/types.ts:5`), so auth is part of the framework, not a kit.

**Which surfaces exist.** Per environment, by fixed names
(`environments/types.ts:25-26`): `deploy: { server, mcp, portal }`, `publish: { sdk, cli }`. Every operation goes to
every surface: the renderers in `packages/generators/src/modules/render/internal/{api,sdk,cli,mcp,server,docs}.ts` each
take all of `model.operations`.

**What connects to what.** `generated/model/edges.json`: 45 edges of kinds refers, reads, acts-on, emits, allowed-by.

## 2. What a kit contributes (six kits tested against)

| Kit | People call it | Agents | Something calls *you* | Your handlers call it | Runs |
|---|---|---|---|---|---|
| wallets | create, link | link, never create | no | Signer | device; server for link |
| chain (viem) | no | no | chain events | contracts, transactions | server, actor |
| payments (Stripe) | checkout | maybe | Stripe webhooks | refund | server |
| email (Resend) | no | no | bounces | send | server |
| auth (Better Auth) | sign-up, sign-in | no | OAuth callbacks | who is this | server; every op depends on it |
| erc20 / safe | transfer | yes | transfer events | yes | chain, server, actor |

Four kinds of contribution, of which today models only the first: (1) operations your app exposes; (2) services your
handlers call, with no surface; (3) inbound entries that are not operations (webhooks, OAuth callbacks, chain events),
server only, never in the SDK, CLI or MCP; (4) runtime pieces (identity, relayer, follower, keeper).

## 3. The three questions, and where each is answered

Aaron's instinct, "say what environments get what", is right for one of the three, and `mcp: false` was wrong because
it mixed them:

| Question | Where it is answered | Today |
|---|---|---|
| Where does the code run? | the operation: `runs` | declared, only `server` accepted |
| Who may reach it, and by what kind of credential? | the operation: `allowed` | roles only, no credential kind |
| Which surfaces are up, where? | the environment: `deploy`, `publish` | fixed names |

So no operation and no mount ever says `mcp: false`. A surface is generated for an operation when some principal
allowed on it can arrive by that surface, and the surface is only deployed where the environment says.

### Options for the second question (the one still open)

**A · Overrides on the kit mount.** `Blueprint.use(wallets, { expose: [Blueprint.expose(wallets.verbs.create, { mcp:
false })] })`. Names surfaces in operations; rejected by the conversation.

**B · One file per surface, an allow-list.** `blueprint/surfaces/mcp.ts` lists operations. Safest, but a second place
to edit for every operation and every kit.

**C · An audience field.** `for: ["people", "agents"]` on the operation, kit defaults, app overrides by reference.
Clean, but a second authorization system beside `allowed`.

**E · Exposure is authorization (recommended to examine first).** The principal learns how it arrived, and `allowed`
already says who may call:

```ts
// roles/types.ts, proposed
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly via: "session" | "token" | "agent" };

// wallets kit: blueprint/things/wallet/verbs/create.ts
export default Blueprint.operation(Wallet, {
  runs: "client",
  allowed: [Blueprint.role.signedIn.notVia("agent")],   // agents never make keys
  …
});
// payments kit: an inbound entry, not an operation
export const stripe = Blueprint.inbound({ path: "/stripe", verify: Stripe.signature, handles: [CheckoutCompleted] });
```

```ts
// acme: blueprint/environments/production.ts: the environment says which surfaces are up
deploy: { server: Deploy.worker({…}), mcp: Deploy.worker({…}), portal: Deploy.site({…}) },
publish: { sdk: Deploy.npm({…}), cli: Deploy.npm({…}) },
```

Generation rule: MCP gets an operation iff some allowed role admits `via: "agent"`; SDK and CLI iff some role admits
`session` or `token`; inbound entries go only to the server; the portal shows all, marked. The app changes a kit's
operation's audience by tightening `allowed` on the mount (by typed reference), the same tool it uses for roles.

| Axis | A mount | B surface files | C audience | E authorization |
|---|---|---|---|---|
| Floor-first | ✅ | ✅ | ✅ | ✅ principal gains one field |
| Reversibility | ✅ | ✅ | ✅ | ✅ |
| Blast radius | ⚠️ surface names in ops | ⚠️ every op in a list | ✅ one field | ⚠️ touches identity, MCP OAuth, roles |
| Correctness | ✅ | ✅ allow-list | ⚠️ two auth systems can disagree | ✅ enforced at runtime, not just hidden |
| Fit | ⚠️ | ⚠️ | ✅ | ✅ uses first-class auth; L2.08 MCP OAuth already knows the caller is an agent |

E's real advantage: hiding a tool from MCP is not security; a token can still call the HTTP route. In E the runtime
refuses an agent credential on `wallet.create` whatever surface it comes in by.

## 4. Other open design points

1. **What a kit is.** Recommended: a package holding a blueprint fragment in the same layout as a project
   (`blueprint/things/<thing>/{thing,machine,events,errors,roles}.ts`, `verbs/`, plus `services/` and `inbound/`),
   its handlers, its journeys and starting worlds, and its choices. Mounted with `Blueprint.use(kit, { choices })` in
   `blueprint/kits/<kit>.ts`, written by `architect add kit <kit>`. Names fold under the kit's namespace
   (`wallet.create`). Alternatives considered: services only; its own deployed service; copied in (shadcn-style).
2. **Services.** `Blueprint.service("signer", { runs: "client", methods: {…}, implementations: […] })`, a
   `Blueprint.step.service(Signer.signMessage)` step, implementations chosen per environment through the mount's
   `choices`. New edge kinds `uses-service`, `runs-in`, `from-kit`.
3. **Less boilerplate per thing.** Today each verb is its own file. Options: (a) `architect add thing allowance
   --states active,exhausted,revoked` scaffolds the folder, the machine and one verb per move; (b) verbs declared from
   the machine, `Blueprint.verbs(machine, { spend: {…}, grant: {…} })`, one file per thing; (c) presets
   (`Blueprint.thing.ledger`, `.lifecycle`). Weigh against "names come from paths" and the one-file-per-verb diffs
   reviewers and `impact` like.
4. **Journeys.** A different agent writes them, against empty handlers. A kit ships its journeys; mounting re-runs
   them in the app's worlds with the app's roles. Open: how a journey drives a `runs: "client"` operation (the runner
   becomes a client), and whether a journey asserts which surface refused (`via: "agent"` refused on create).
5. **Auth as the proving kit.** Auth is built in today and has all four kinds of contribution. Moving it into a kit
   first proves the mechanism before wallets.
6. **The design loop.** `Blueprint.question("…", { options, answeredBy: "spikes/…" })` for the undecided;
   `architect check --ready`; skills 🧭 wayfinder, 📐 specifier, ✍️ author, 🔨 builder; `architect brief --spec`;
   `architect model --graph` printing mermaid from edges.
7. **Generators.** `create architect`, `architect new kit`, `add kit`, `add service`, `add inbound`.

## 5. The tutorial this design must make true

Write it, in the record, as the builder would read it, end to end, each step marked works-today or proposed: create a
project; add a thing with its machine; add verbs; generate (and what lands in `generated/{model,server,api,sdk,cli,
mcp,docs,portal}` and `src/`); a journey fails on an empty handler; write the handler; check; prove local; call it
from the SDK, the CLI, MCP and HTTP; promote, publish, watch, impact; add the wallets kit, with `wallet.create`
running on the device, refused to agents, and its Signer used by acme's own handler; upgrade the kit and see what
went stale.

```text
You are a 📐 Designer for Architect. Read AGENTS.md, .agents/skills/threads/SKILL.md ("Talking to Aaron"), then
design/briefs/K1-kits-and-surfaces.md, design/build-plan.md (layer 3 and D4), design/decisions/N1-noir-target.md,
and the code it cites on origin/layer/3. Codex is building on layer/3: never touch layer/* or packages/.

Decide, with evidence, and record in design/decisions/K1-kits.md:
1. Where-it-runs, who-may-reach-it and which-surfaces-exist: confirm the three-place split or replace it. For
   who-may-reach-it, compare A, B, C and E from the brief on the rubric in ~/.claude/CLAUDE.md, in real code.
2. What a kit is, its folder layout, how it is mounted and named, and what each target gets from it, tested on all
   six kits in the brief's table, not just wallets.
3. Services, inbound entries and runtime pieces as declarations.
4. Boilerplate per thing (section 4.3), journeys for kits and client operations (4.4), auth as the proving kit (4.5).
5. The design loop and the generators (4.6, 4.7).

Done when the record answers these with code sketches; spikes/kits-dx/ holds the tutorial of section 5 as a static
page plus a sketch of acme with wallets and payments mounted (folders and files, labelled proposed); build steps for
stage 4 are proposed in the record (not edited into build-plan.md), each with a done-when check; questions only
Aaron can answer are batched in the batch-grill format. Work on a branch design/kits-decision from origin/main and
land it by a pull request. Report to Aaron in short spoken sentences.
```
