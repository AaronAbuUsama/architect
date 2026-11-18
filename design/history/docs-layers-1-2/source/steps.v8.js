/* ---------- The walkthrough, in five layers ----------
   Each step adds or changes files. N(path, n) is a file new in this step, as it stands after layer n;
   D(path, n) is a file layer n changes, with its changes marked; a line with Blueprint.todo( or notWritten( is a blank. */
const EXAMPLE_FILES = /things\/allowance\/|values\/|blueprint\/kits\/|starting-worlds\/funded|journeys\/(spend-within|monthly-reset|revoke-then)|implementation\/(contracts|handlers\/allowance)|generated\/(contracts|keeper|mcp|api\/src\/(allowance|contracts)|sdk\/src\/allowance|sdk\/package|cli\/src\/(allowance|wallet)|cli\/homebrew|docs\/allowance|infra\/src\/production|model\/changes)|spikes\//;
const N = (p, n) => ({ p, k: LAYERED[p].k, c: at(p, n) });
const D = (p, n) => ({ p, k: LAYERED[p].k, c: at(p, n, true) });
const LAYER_NAMES = ["", "Declare and call", "Prove and ship", "Reach out", "On chain", "Time"];

const BASE_OVERRIDES = {
  "acme/generated/api/src/index.ts":
`// Generated from the blueprint. Do not edit.
export * as system from "./system"
export * as session from "./session"
export * as person from "./person"
export * as organization from "./organization"
export * as membership from "./membership"
export * as apiKey from "./api-key"
export { Api } from "./api"           // the whole HttpApi, for the server and the SDK`,
  "acme/generated/model/model.json":
`{
  "project": "acme",
  "revision": "1a2b3c4",
  "things": ["system", "session", "person", "organization", "membership", "api-key"],
  "operations": 17,
  "journeys": ["health is up", "sign up and sign in", "found an organisation"]
}`,
};
const BASE_AT_LAYER_ONE = ["acme/architect.config.ts", "acme/blueprint/environments/local.ts", "acme/blueprint/environments/test.ts",
  "acme/blueprint/environments/staging.ts", "acme/blueprint/environments/production.ts"];
for (const p of BASE_AT_LAYER_ONE) BASE_OVERRIDES[p] = at(p, 1);
BASE_OVERRIDES["acme/implementation/services.ts"] = at("acme/implementation/services.ts", 0);

const MODEL_1 =
`{
  "project": "acme",
  "revision": "9f3c2e1",
  "hash": "sha256:4b1a...e07",
  "things": ["system", "session", "person", "organization", "membership", "api-key", "allowance"],
  "operations": [
    { "name": "allowance.spend", "hash": "sha256:91d0...aa2", "move": "spend", "outcomes": ["active", "exhausted"],
      "errors": ["AllowanceExceeded", "AllowanceNotFound", "AllowanceNotActive", "NotAllowed"], "allowed": ["grantee"],
      "steps": ["allowance.spend.load", "allowance.spend.record"], "idempotent": "request", "budget": { "p95Ms": 150 } }
  ],
  "journeys": [{ "name": "spend within allowance", "uses": ["allowance.spend"] }],
  "edges": [
    { "from": "allowance.spend", "to": "thing:allowance", "kind": "acts-on" },
    { "from": "journey:spend within allowance", "to": "allowance.spend", "kind": "proves" }
  ]
}`;
const CHANGES_2 =
`{
  "from": "1.0.0",
  "to": "1.1.0",
  "changes": [
    { "kind": "added", "what": "allowance.list", "bump": "minor" }
  ],
  "stale": [],
  "proven": ["allowance.grant", "allowance.spend", "allowance.revoke", "allowance.get"]
}`;
const CHANGES_4 =
`{
  "from": "1.1.0",
  "to": "2.0.0",
  "changes": [
    { "kind": "changed", "what": "allowance.spend.payload", "detail": "memo removed, to added", "bump": "major" },
    { "kind": "changed", "what": "allowance.grant.payload", "detail": "token added", "bump": "major" },
    { "kind": "added", "what": "allowance.lives", "detail": "on chain: AllowanceVault, one per organisation" },
    { "kind": "added", "what": "signedBy on grant, spend and revoke" }
  ],
  "stale": ["allowance.grant", "allowance.spend", "allowance.revoke", "allowance.get", "allowance.list"],
  "contracts": { "AllowanceVault": "new: deployed per organisation" }
}`;

const STEPS = [
/* ===== Layer 1: declare and call ===== */
{ t: "Start a project", layer: 1, stage: "Set up", see: "get",
  say: "You start in an empty folder and run one command. Architect writes the layout and the starter: health, sign up and sign in, organisations, memberships and API keys, each with its journeys. Blueprint holds the declarations: what the system is. Implementation holds what you write: how it does it. Generated holds what Architect builds: in this first layer, the server, the API, the SDK, the CLI and the docs, all running on your machine. Check passes before you've declared anything of your own.",
  cmd: "npx create-nx-workspace acme --preset=@architect/preset\ncd acme && pnpm architect check",
  out: "✔ created acme  (Nx workspace on pnpm)\n  blueprint        6 things · 17 operations · 3 journeys   (the starter)\n  implementation/  handlers and services, scaffolded\n  generated/       server · api · sdk · cli · docs · model\n\n✔ architect check    types ✔  rules ✔  drift ✔  ratchets 0",
  focus: "acme/architect.config.ts", files: [] },

{ t: "Ideate and spike", layer: 1, stage: "Design · ideate and spike", see: "layers",
  say: "The idea: an owner lets a member spend some of the organisation's money each month, up to a limit. You talk it through with your agent, and the agent proposes building it in layers. First the allowance as plain records, so its life, its refusals and who may do what are proven before anything else. Then shipping it. Then real money on chain, signed by people's own wallets. Then time, for the monthly reset. The spike is throwaway code that checks the idea holds up.",
  cmd: "architect spike allowances",
  out: "CREATE spikes/allowances/README.md\nCREATE spikes/allowances/try.ts\n\nspikes/ is never built, checked or deployed",
  focus: "acme/spikes/allowances/README.md",
  files: [
    { p: "acme/spikes/allowances/README.md", k: "scaffold", c:
`# Spike: allowances

Question: can an owner let a member spend from the organisation's money, up to a limit each month?
Tried: an allowance record with a limit and a spent total; spend checks what is left.
Found: an allowance has a life (active, exhausted, revoked), and spending past the limit must be refused with what is left.
Plan, in layers:
  1. the allowance as records: its machine, grant, spend, revoke, its journeys
  2. ship it: test worlds, staging, the SDK and CLI published
  3. the standard library's wallets and chain kits
  4. move it on chain: real money in a vault, each payload signed by the person's own wallet
  5. time: the monthly reset, and expiry after a year` },
    { p: "acme/spikes/allowances/try.ts", k: "scaffold", c:
`// Throwaway: never built, checked or deployed. Deleted once the blueprint covers it.
const spend = (a: { limit: number; spent: number; state: string }, amount: number) => {
  if (a.state !== "active") throw new Error("not active")
  if (amount > a.limit - a.spent) throw new Error("over: " + (a.limit - a.spent) + " left")
  a.spent += amount
  if (a.spent === a.limit) a.state = "exhausted"
}` } ] },

{ t: "Add a thing", layer: 1, stage: "Design · specify", see: "concepts",
  say: "You add a thing called allowance. Its folder appears with the same five files every thing has: the thing itself, its machine, its events, its errors and its roles. A values file appears too, for the named types its fields are made of. The highlighted lines are blanks. They compile, but check won't pass until you fill them in.",
  cmd: "pnpm architect add thing allowance",
  out: "CREATE blueprint/things/allowance/thing.ts\nCREATE blueprint/things/allowance/machine.ts\nCREATE blueprint/things/allowance/events.ts\nCREATE blueprint/things/allowance/errors.ts\nCREATE blueprint/things/allowance/roles.ts\nCREATE blueprint/values/money.ts\n\n✖ architect check   allowance has 3 blanks",
  focus: "acme/blueprint/things/allowance/thing.ts",
  files: [N("acme/blueprint/values/money.ts", 1),
    { p: "acme/blueprint/things/allowance/thing.ts", k: "scaffold", c:
`import { Blueprint } from "@architect/blueprint"

export const Allowance = Blueprint.thing({
  description: Blueprint.todo("say what an allowance is, in one sentence"),
  fields: Blueprint.todo("declare its fields, starting with its id"),
})` },
    { p: "acme/blueprint/things/allowance/machine.ts", k: "scaffold", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "./thing"

export const machine = Blueprint.machine(Allowance, {
  states: ["created"],
  moves: Blueprint.todo("each move: from which states, to which, emitting which event"),
})` },
    { p: "acme/blueprint/things/allowance/events.ts", k: "scaffold", c: `import { Blueprint } from "@architect/blueprint"\nimport { Allowance } from "./thing"\n` },
    { p: "acme/blueprint/things/allowance/errors.ts", k: "scaffold", c: `import { Blueprint } from "@architect/blueprint"\n` },
    { p: "acme/blueprint/things/allowance/roles.ts", k: "scaffold", c: `import { Blueprint } from "@architect/blueprint"\nimport { Allowance } from "./thing"\n` } ] },

{ t: "Give it a life", layer: 1, stage: "Design · specify", see: "concepts",
  say: "You fill in the thing and its machine. Three states: active, exhausted and revoked. Grant makes an allowance active. Spend has two outcomes: still active, or exhausted when nothing is left. Revoke ends it. Every move names its event. Any move from a state it can't start from is refused with a refusal Architect generates, AllowanceNotActive, which carries the state it was in.",
  cmd: "pnpm architect check",
  out: "✔ allowance.thing     5 fields\n✔ allowance.machine   3 states · 3 moves · spend has 2 outcomes\n  generated refusal   AllowanceNotActive (exit 40)\n✖ architect check   no operation makes the moves grant, spend, revoke yet",
  focus: "acme/blueprint/things/allowance/machine.ts",
  files: [N("acme/blueprint/things/allowance/thing.ts", 1), N("acme/blueprint/things/allowance/machine.ts", 1), N("acme/blueprint/things/allowance/events.ts", 1)] },

{ t: "Errors and roles", layer: 1, stage: "Design · specify", see: "auth",
  say: "Two refusals depend on data: spending more than is left, and an allowance that doesn't exist. Each is a typed error with an exit code. Then who may call: the grantee is the person the allowance was granted to, and owners come from the starter's organisation roles. Later, the same role decides whose wallet must sign.",
  cmd: "pnpm architect check",
  out: "✔ allowance.errors    AllowanceExceeded 41 · AllowanceNotFound 43\n✔ allowance.roles     grantee\n✖ architect check   no operation makes the moves grant, spend, revoke yet",
  focus: "acme/blueprint/things/allowance/roles.ts",
  files: [N("acme/blueprint/things/allowance/errors.ts", 1), N("acme/blueprint/things/allowance/roles.ts", 1)] },

{ t: "The operations and a read", layer: 1, stage: "Design · specify", see: "operations",
  say: "Now the verbs. Grant, spend and revoke each make one move, and declare their payload, their answer, their errors, who may call, their steps and their budget. Spend is idempotent: retried with the same request key, it spends once. Get is a read. It changes nothing, so it has no move and no handler: Architect answers it from the allowance's own records.",
  cmd: "pnpm architect add operation allowance.grant allowance.spend allowance.revoke\npnpm architect add read allowance.get",
  out: "CREATE blueprint/things/allowance/verbs/grant.ts\nCREATE blueprint/things/allowance/verbs/spend.ts\nCREATE blueprint/things/allowance/verbs/revoke.ts\nCREATE blueprint/things/allowance/verbs/get.ts\n\n✔ every move has an operation\n✔ the blueprint has no blanks: ready to generate",
  focus: "acme/blueprint/things/allowance/verbs/spend.ts",
  files: ["grant", "spend", "revoke", "get"].map((v) => N("acme/blueprint/things/allowance/verbs/" + v + ".ts", 1)) },

{ t: "What each handler is given", layer: 1, stage: "Build · build", see: "operations",
  say: "The blueprint has no blanks, so you generate. For every operation and read you get an endpoint, an SDK call, a CLI command and a docs page. For each operation, Architect also generates exactly what its handler is given: its steps as span wrappers, its move, and an error type that is the declared union and nothing more. Then it scaffolds the handler itself, with the blanks where the work goes.",
  cmd: "pnpm architect generate",
  out: "CREATE generated/api/src/allowance/spend.handler.ts   (and grant, revoke)\nCREATE generated/sdk/src/allowance/spend.ts            (and grant, revoke, get)\nCREATE generated/cli/src/allowance/spend.ts            acme allowance spend\nCREATE generated/docs/allowance/spend.md\nCREATE implementation/handlers/allowance/spend.ts      scaffolded, 4 blanks (and grant, revoke)",
  focus: "acme/generated/api/src/allowance/spend.handler.ts",
  files: [N("acme/generated/api/src/allowance/spend.handler.ts", 1), { p: "acme/generated/model/model.json", k: "generated", c: MODEL_1 }, N("acme/generated/sdk/src/allowance/spend.ts", 1), N("acme/generated/cli/src/allowance/spend.ts", 1), N("acme/generated/docs/allowance/spend.md", 1),
    { p: "acme/implementation/handlers/allowance/spend.ts", k: "scaffold", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"

export default Handlers.allowance.spend(({ allowance, amount, memo }, { steps, move }) =>
  Effect.gen(function* () {
    const found = yield* steps.load(Blueprint.todo("find the allowance"))
    yield* Blueprint.todo("refuse with AllowanceExceeded if amount is more than is left")
    yield* steps.record(Blueprint.todo("record the spend"))
    yield* move(found, Blueprint.todo("which outcome: active or exhausted"))
    return Blueprint.todo("the answer: what is left")
  }))` }] },

{ t: "Write the handlers", layer: 1, stage: "Build · build", see: "operations",
  say: "An agent fills the handlers, from a brief you can print yourself with architect brief. It names the handler, the declaration it must read, the files it must not touch, and the evals that must pass. The handler is short because everything around it is generated: the role check runs before it, the idempotency key is checked before it, and the move applies the new state and emits the event. Returning an undeclared error doesn't compile.",
  cmd: "pnpm architect brief allowance.spend\npnpm architect check",
  out: "Job      fill implementation/handlers/allowance/spend.ts (4 blanks)\nRead     blueprint/things/allowance/ · generated/api/src/allowance/spend.handler.ts\nDon't    touch blueprint/, generated/, or any journey\nDone     spend-within-allowance and revoke-then-spend pass locally; all 9 evals green\n\n✔ types ✔  rules ✔  drift ✔\n✔ every handler's error type is within its declaration\n  blanks left   0",
  focus: "acme/implementation/handlers/allowance/spend.ts",
  files: [N("acme/implementation/handlers/allowance/spend.ts", 1), N("acme/implementation/handlers/allowance/grant.ts", 1), D("acme/implementation/services.ts", 1)] },

{ t: "A starting world, and journeys", layer: 1, stage: "Build · test", see: "worlds",
  say: "Journeys are written by a different agent from the builders, from the declarations alone. They start from a starting world, which is seeded by running declared operations, the same way the system is used: ada owns the organisation and grants olga five hundred. One journey spends within the limit and is refused past it. Another revokes, and spending is then refused with the state it was in.",
  cmd: "pnpm architect add journey spend-within-allowance revoke-then-spend",
  out: "CREATE blueprint/starting-worlds/funded.ts\nCREATE blueprint/journeys/spend-within-allowance.ts\nCREATE blueprint/journeys/revoke-then-spend.ts",
  focus: "acme/blueprint/journeys/spend-within-allowance.ts",
  files: [N("acme/blueprint/starting-worlds/funded.ts", 1), N("acme/blueprint/journeys/spend-within-allowance.ts", 1), N("acme/blueprint/journeys/revoke-then-spend.ts", 1)] },

{ t: "Prove it locally", layer: 1, stage: "Build · test", see: "proof",
  say: "Prove runs every journey in a fresh local world, and checks every call with the built-in evals: the answer's shape, the declared errors, the machine's path, the events, who may call, the steps, the budget, coverage and explainability. Everything is green, and coverage shows every move and every refusal reached. While you work, architect dev keeps a local world like this one running, and re-proves whatever a change touches. That's the first layer: a thing declared, called through a generated SDK and CLI, and proven.",
  cmd: "pnpm architect prove --env local",
  out: "world       local · fresh database · seeded: funded\n\nallowance.grant    9 evals ✔   p95 18ms   budget 200ms\nallowance.spend    9 evals ✔   p95 12ms   budget 150ms\nallowance.revoke   9 evals ✔   p95 9ms    budget 150ms\nallowance.get      9 evals ✔   p95 4ms    budget 50ms\n\ncoverage    moves 3/3 · outcomes 2/2 · refusals 4/4",
  focus: "acme/blueprint/journeys/revoke-then-spend.ts", files: [] },

/* ===== Layer 2: prove and ship ===== */
{ t: "Push, and see the verdict", layer: 2, stage: "Build · test", see: "proof",
  say: "Layer two ships it. You push, and CI makes a fresh test world with a two-hour expiry, runs the same journeys, and records a verdict for each operation in the test environment. A verdict is evidence CI made and signed: nothing run on your own machine counts as one. The world is destroyed when the run ends.",
  cmd: "git push",
  out: "architect / prove (test)\n  world      test-pr-12 · expires in 2h · d1 database\n  verdicts   allowance.grant ✔  spend ✔  revoke ✔  get ✔   (revision 3d9e0a1)\n  world      destroyed",
  focus: "acme/.github/workflows/architect.yml", files: [] },

{ t: "Make a change", layer: 2, stage: "Design · specify, again", see: "deploy",
  say: "Owners want to see every allowance in their organisation, so you add a read, list. The compiled model compares itself with the last release and works out what changed: a new read is a minor version. It lists the proofs a change makes stale, and architect impact tells you the same before you make it. This one touches nothing that's already proven, so nothing goes stale.",
  cmd: "pnpm architect impact blueprint/things/allowance/verbs/list.ts\npnpm architect add read allowance.list\npnpm architect generate && pnpm architect prove --env local",
  out: "impact   new read · minor · stale none · regenerate api, sdk, cli, mcp, docs\n\nCREATE blueprint/things/allowance/verbs/list.ts\n\nchanges since 1.0.0\n  added    allowance.list   minor\n  next     1.1.0\n  stale    none\n\nallowance.list    9 evals ✔   p95 11ms  budget 100ms",
  focus: "acme/generated/model/changes.json",
  files: [N("acme/blueprint/things/allowance/verbs/list.ts", 2), { p: "acme/generated/model/changes.json", k: "generated", c: CHANGES_2 }] },

{ t: "Deploy and publish", layer: 2, stage: "Build · deploy", see: "deploy",
  say: "Each environment now says where every output goes. Some are deployed: they run somewhere. The server is a worker, the MCP server is a remote server agents connect to with OAuth, and the portal is a site. Some are published: others install them. The SDK goes to npm. The CLI goes to npm, a Homebrew tap and GitHub releases. Their version is the one the model worked out. Production only accepts a revision that's green in staging.",
  cmd: "pnpm architect promote --to staging\npnpm architect promote --to production",
  out: "staging      deployed  server · mcp · portal\n             published @acme/sdk@1.1.0-next.1 · acme@1.1.0-next.1\n             verdicts  5/5 ✔\n\nproduction   from staging 3d9e0a1 ✔\n             deployed  server api.acme.dev · mcp mcp.acme.dev · portal acme.dev\n             published @acme/sdk@1.1.0 (npm) · acme@1.1.0 (npm, brew acme/tap, github releases)",
  focus: "acme/blueprint/environments/production.ts",
  files: [D("acme/architect.config.ts", 2), D("acme/blueprint/environments/staging.ts", 2), D("acme/blueprint/environments/production.ts", 2),
    N("acme/generated/infra/src/production.ts", 2), N("acme/generated/sdk/package.json", 2), N("acme/generated/cli/homebrew/acme.rb", 2), N("acme/generated/mcp/src/server.ts", 2)] },

{ t: "Watch", layer: 2, stage: "Build · watch", see: "proof",
  say: "In production, nobody runs journeys. The same evals run on what the running system records: every real call's answer, refusals, events, steps and time against its budget. The portal shows each operation's verdict in each environment, and anything drifting: which operation, where, and since when. A measure that gets worse becomes a task.",
  cmd: "pnpm architect watch --env production",
  out: "production   last 24h · 412 calls\n  allowance.spend    p95 61ms (budget 150ms) ✔   refusals: AllowanceExceeded 9 · AllowanceNotActive 2\n  explainability     99.4% of call time in declared steps\n  drift              none",
  focus: "acme/generated/model/changes.json", files: [] },

/* ===== Layer 3: reach out ===== */
{ t: "The standard library", layer: 3, stage: "Build · build", see: "std",
  say: "Layer three reaches for code that already exists. Architect's standard library is a set of kits, each wrapping existing packages behind a primitive. You use two. Wallets gives the signer primitive: a person proves an address is theirs by signing in with Ethereum, and each caller signs with a local key, a browser wallet, or later an embedded wallet or a smart account. Chain has one real dependency, viem, wrapped once, with a relayer that pays the gas for signed payloads and simulates each one before it does. Kits arrive finished: adding one writes one file of your choices, and generate folds the kit's declarations into your model, so its operations get the same endpoints, docs and evals as yours. Every CLI now gets wallet commands, and the keys stay on your machine.",
  cmd: "pnpm architect add kit wallets chain",
  out: "CREATE blueprint/kits/wallets.ts\nCREATE blueprint/kits/chain.ts\nCREATE generated/cli/src/wallet.ts      acme wallet create · import · link · list\n\n✔ test people now get a wallet in every world",
  focus: "acme/blueprint/kits/wallets.ts",
  files: [N("acme/blueprint/kits/wallets.ts", 3), N("acme/blueprint/kits/chain.ts", 3), N("acme/generated/cli/src/wallet.ts", 3)] },

/* ===== Layer 4: on chain ===== */
{ t: "Move it on chain", layer: 4, stage: "Design · specify, again", see: "targets",
  say: "Layer four moves the allowance on chain, as one declared change. The thing says it lives in a contract, AllowanceVault, one per organisation, and gains a key and a token. The values say their Solidity types. Spend now sends to an address, and grant, spend and revoke each say whose wallet signs. The environments get a chain. The model works out that the payloads changed, so this is a major version, and every allowance proof is stale until it's proven again.",
  cmd: "pnpm architect check",
  out: "targets      effect ✔  solidity ✔ (new: allowance lives on chain)\nchanges since 1.1.0\n  changed  allowance.spend.payload   major\n  changed  allowance.grant.payload   major\n  next     2.0.0\n  stale    allowance.grant · spend · revoke · get · list\n✔ the blueprint has no blanks: ready to generate",
  focus: "acme/blueprint/things/allowance/thing.ts",
  files: [D("acme/blueprint/things/allowance/thing.ts", 4), D("acme/blueprint/values/money.ts", 4), N("acme/blueprint/values/chain.ts", 4),
    D("acme/blueprint/things/allowance/events.ts", 4), D("acme/blueprint/things/allowance/errors.ts", 4),
    D("acme/blueprint/things/allowance/verbs/grant.ts", 4), D("acme/blueprint/things/allowance/verbs/spend.ts", 4), D("acme/blueprint/things/allowance/verbs/revoke.ts", 4), D("acme/blueprint/things/allowance/verbs/get.ts", 4),
    D("acme/blueprint/environments/local.ts", 4), D("acme/blueprint/environments/test.ts", 4), D("acme/blueprint/environments/staging.ts", 4), D("acme/blueprint/environments/production.ts", 4),
    D("acme/blueprint/starting-worlds/funded.ts", 4), { p: "acme/generated/model/changes.json", k: "generated", c: CHANGES_4 }] },

{ t: "Generate the Solidity", layer: 4, stage: "Build · build", see: "targets",
  say: "Generate writes the Solidity side. The allowance's types: its states and moves, its events and its errors. Its machine, compiled into a contract the vault inherits, so state can only change the ways the blueprint allows. What each person signs: every operation's payload as typed data, checked by OpenZeppelin's SignatureChecker, which accepts a plain wallet and a smart account alike, with a nonce so a signed request lands once. Foundry tests for every move from every state, every write signed by the wrong wallet, and every signature replayed. And the vault itself, scaffolded with blanks.",
  cmd: "pnpm architect generate\nforge test",
  out: "CREATE generated/contracts/AllowanceTypes.sol\nCREATE generated/contracts/AllowanceMachine.sol\nCREATE generated/contracts/AllowanceSignatures.sol\nCREATE generated/contracts/test/AllowanceMachine.t.sol   24 cases\nCREATE implementation/contracts/AllowanceVault.sol      scaffolded, 3 blanks\n\nforge test   0 passed · 24 failed: NotWritten(\"spend: check the limit and the balance, move the money\") …",
  focus: "acme/generated/contracts/AllowanceSignatures.sol",
  files: [N("acme/generated/contracts/AllowanceTypes.sol", 4), N("acme/generated/contracts/AllowanceMachine.sol", 4), N("acme/generated/contracts/AllowanceSignatures.sol", 4), N("acme/generated/contracts/test/AllowanceMachine.t.sol", 4),
    { p: "acme/implementation/contracts/AllowanceVault.sol", k: "scaffold", c:
`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Allowance} from "../../generated/contracts/AllowanceTypes.sol";
import {AllowanceMachine} from "../../generated/contracts/AllowanceMachine.sol";
import {AllowanceSignatures} from "../../generated/contracts/AllowanceSignatures.sol";
import {notWritten} from "../../generated/contracts/NotWritten.sol";

contract AllowanceVault is AllowanceMachine, AllowanceSignatures {
    mapping(address => bool) public isOwner;

    constructor(address[] memory owners) AllowanceSignatures("AllowanceVault") {
        for (uint256 i; i < owners.length; i++) isOwner[owners[i]] = true;
    }

    function grant(Grant calldata g, bytes calldata sig) external {
        _signedBy(_hashGrant(g), g.owner, sig);
        _useNonce(g.owner, g.nonce, g.deadline);
        notWritten("grant: check the signer is an owner, store the record");
        emit Allowance.AllowanceGranted(g.allowance, g.limit);
    }

    function spend(Spend calldata s, bytes calldata sig) external returns (uint128 remaining) {
        notWritten("spend: check the limit and the balance, move the money");
    }

    function revoke(Revoke calldata r, bytes calldata sig) external {
        _signedBy(_hashRevoke(r), r.owner, sig);
        _useNonce(r.owner, r.nonce, r.deadline);
        notWritten("revoke: check the signer is an owner");
        emit Allowance.AllowanceRevoked(r.allowance);
    }
}` }] },

{ t: "Write the contract", layer: 4, stage: "Build · build", see: "targets",
  say: "An agent fills the contract's blanks. Its brief names the generated types and helpers it must use and the Foundry tests that must pass; it can't change the tests, and it can't change state except through the generated step function. The person's signature is checked before anything moves, so the relayer that submits the transaction can never act on its own. When the tests pass, forge build writes the ABI, which the compiled contract owns: Architect reads it, and doesn't redeclare it.",
  cmd: "forge test\nforge build",
  out: "forge test   24 passed · 0 failed\n  machine      12/12   every move from every state\n  signatures    6/6    every write, signed by the wrong wallet\n  replays       6/6    every signed request, sent twice\n\nforge build  out/AllowanceVault.sol/AllowanceVault.json",
  focus: "acme/implementation/contracts/AllowanceVault.sol",
  files: [N("acme/implementation/contracts/AllowanceVault.sol", 4)] },

{ t: "What changes for callers", layer: 4, stage: "Build · build", see: "std",
  say: "Generate again. The contract's Effect client comes from the ABI and the blueprint together: every write a span, every custom error decoded into its typed error, every signed payload simulated, then submitted, by the relayer. Each handler is now given the vault's client and a signature already checked against the caller's linked wallet. The SDK takes a signer: it fetches what to sign, signs it with whatever wallet the caller passes, and sends both. The CLI signs with your local key. The SDK's next version is 2.0.0.",
  cmd: "pnpm architect generate",
  out: "CREATE generated/contracts/abi.ts                       from forge build\nCREATE generated/api/src/contracts/allowance-vault.ts\nUPDATE generated/api/src/allowance/spend.handler.ts     + vault, signature\nUPDATE generated/sdk/src/allowance/spend.ts            + signer\nUPDATE generated/cli/src/allowance/spend.ts            + --wallet\nUPDATE generated/mcp/src/server.ts                     signing: ask\nUPDATE generated/sdk/package.json                      2.0.0",
  focus: "acme/generated/api/src/allowance/spend.handler.ts",
  files: [N("acme/generated/contracts/abi.ts", 4), N("acme/generated/api/src/contracts/allowance-vault.ts", 4), D("acme/generated/api/src/allowance/spend.handler.ts", 4),
    D("acme/generated/sdk/src/allowance/spend.ts", 4), D("acme/generated/cli/src/allowance/spend.ts", 4), D("acme/generated/docs/allowance/spend.md", 4), D("acme/generated/mcp/src/server.ts", 4), D("acme/generated/sdk/package.json", 4), D("acme/generated/infra/src/production.ts", 4)] },

{ t: "Sign and prove on a local chain", layer: 4, stage: "Build · test", see: "worlds",
  say: "The handlers change: instead of updating records, they send the signed payload to the vault and wait for the receipt. The journeys barely change, because they're written against operations, not storage: spend now sends to an address. The starting world now deploys a vault for the organisation and funds it on a local chain, which runs as a bench. Each test person signs with their own wallet, made fresh in every world. Every receipt is written straight through to the organisation's index, and the chain follower catches anything that reached the vault some other way. Prove runs it all, and the generated Foundry tests run too.",
  cmd: "pnpm architect prove --env local\npnpm architect chain status",
  out: "world       local · bench anvil · vault for acme-demo 0x5Fb…aa3, funded 10000 TestUSD · wallets: ada, olga, bob\n\nallowance.grant    9 evals ✔   p95 1.1s  budget 3s     signed by ada\nallowance.spend    9 evals ✔   p95 1.4s  budget 4s     signed by olga\nallowance.revoke   9 evals ✔   p95 0.9s  budget 3s     signed by ada\nallowance.get      9 evals ✔   p95 41ms  budget 300ms\nallowance.list     9 evals ✔   p95 38ms  budget 100ms\n\ncoverage    moves 3/3 · outcomes 2/2 · refusals 5/5\nforge       24/24\n\nchain      bench anvil · block 418\nfollower   AllowanceVault  checkpoint 418 · lag 0 · reorgs 0\nrelayer    nonce 12 · queue 0 · simulated 12/12 before sending",
  focus: "acme/implementation/handlers/allowance/spend.ts",
  files: [D("acme/implementation/handlers/allowance/spend.ts", 4), D("acme/implementation/handlers/allowance/grant.ts", 4), D("acme/blueprint/journeys/spend-within-allowance.ts", 4), D("acme/blueprint/journeys/revoke-then-spend.ts", 4)] },

/* ===== Layer 5: time ===== */
{ t: "Give it time", layer: 5, stage: "Design · specify, again", see: "time",
  say: "Layer five adds time. The machine gets two moves that no caller makes. Reset happens every calendar month, counted from the grant, and fires lazily: the contract works it out on the next spend, from the chain's own clock, so it costs nothing to run. Expire happens a year after the grant, and is fired by the keeper, Architect's built-in caller for time, at most ten minutes late. Nothing scans for it: the grant sets the allowance's own timer through the world's timer service. The keeper has its own wallet, which the contract only lets make time moves. Local and test worlds get a stepped clock, and a journey moves it. Two rules come with time: a plain sleep in a handler is banned by lint, and the local chain's clock stands still between steps.",
  cmd: "pnpm architect generate\nforge test",
  out: "✔ allowance.machine   4 states · 5 moves · 2 by time (reset: lazy, expire: keeper)\nUPDATE generated/contracts/AllowanceTypes.sol     + Reset, Expire, AllowanceNotDue, NotKeeper\nUPDATE generated/contracts/AllowanceMachine.sol   + _period (calendar months from the grant), _dueAfter\nCREATE generated/contracts/Calendar.sol\nCREATE generated/keeper/src/allowance.expire.ts   a timer per allowance, set by its grant\nUPDATE implementation/contracts/AllowanceVault.sol   2 blanks: _due, expire\n\nforge test   31 passed (after the blanks were filled)",
  focus: "acme/blueprint/things/allowance/machine.ts",
  files: [D("acme/blueprint/things/allowance/machine.ts", 5), D("acme/blueprint/things/allowance/events.ts", 5), D("acme/generated/contracts/AllowanceTypes.sol", 5), D("acme/generated/contracts/AllowanceMachine.sol", 5),
    D("acme/implementation/contracts/AllowanceVault.sol", 5), N("acme/generated/contracts/Calendar.sol", 5), N("acme/generated/keeper/src/allowance.expire.ts", 5), D("acme/generated/contracts/abi.ts", 5),
    D("acme/blueprint/environments/local.ts", 5), D("acme/blueprint/environments/test.ts", 5), D("acme/blueprint/environments/staging.ts", 5), D("acme/blueprint/environments/production.ts", 5),
    D("acme/blueprint/starting-worlds/funded.ts", 5), N("acme/blueprint/journeys/monthly-reset.ts", 5), D("acme/generated/infra/src/production.ts", 5)] },

{ t: "Prove time, and promote", layer: 5, stage: "Build · deploy and watch", see: "time",
  say: "In a stepped world, the world's own Durable Object steps time like a simulation. It moves the clock, fires every timer that's due, moves the local chain's time with it, and waits until the world is quiet before the next step. So a month and a year pass in seconds, the same way every time, and the tenth eval checks that every time move happened on time. Then the same promotion as before: staging, then production, where each allowance's timer is a real alarm, watched for lateness like everything else.",
  cmd: "pnpm architect prove --env local\npnpm architect promote --to staging && pnpm architect promote --to production",
  out: "world       local · clock stepped from 2026-11-01 · anvil\n  monthly reset   clock +1 month → allowance.reset   lazy, on time ✔\n  expiry          clock +1 year  → allowance.expire  keeper, on time ✔ 3m late (10m allowed)\n  coverage        moves 5/5 · outcomes 2/2 · refusals 5/5\n\nproduction   deployed  server · mcp · portal · timers · follower · vault factory (base, verified)\n             published @acme/sdk@2.1.0 · acme@2.1.0",
  focus: "acme/blueprint/journeys/monthly-reset.ts", files: [] },
];
STEPS.forEach((s) => (s.stage = "Layer " + s.layer + " · " + s.stage));
