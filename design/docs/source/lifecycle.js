/* ---------- The life cycle of each kind of declaration, for the conventions page: the allowance example ---------- */
const LIFECYCLE = [
{ id: "thing", name: "Thing", file: "things/<thing>/thing.ts", cmd: "architect add thing allowance",
  rule: "A noun of the application, with an identity and fields. Singular, kebab-case folder; the folder always holds thing.ts, machine.ts, events.ts, errors.ts, roles.ts and verbs/. Its name is the folder's name, never typed. A thing says where its state lives, with lives: the database (Cloudflare's D1) unless it says otherwise; an actor, Blueprint.actor(), a Durable Object that owns its state in its own storage; or the chain, naming its contract, which makes Solidity one of its targets.",
  scaffold: { p: "things/allowance/thing.ts", c:
`export const Allowance = Blueprint.thing({
  description: Blueprint.todo("say what an allowance is, in one sentence"),
  fields: Blueprint.todo("declare its fields, starting with its id"),
})` },
  filled: { p: "things/allowance/thing.ts", c:
`export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: {
    id: Blueprint.id("alw"),
    key: AllowanceKey,                         // its id on chain
    organization: Organization.fields.id,
    member: Person.fields.id,
    token: TokenAddress,
    limit: Amount,
    spent: Amount,
  },
  lives: Blueprint.chain({ contract: "AllowanceVault", key: "key", per: "organization" }),   // one vault per organisation
})` },
  generated: [
    { p: "generated/api/src/allowance/thing.ts", c:
`// Generated from the blueprint. Do not edit.
export const AllowanceId = Schema.String.pipe(Schema.startsWith("alw_"), Schema.brand("AllowanceId"))
export const Allowance = Schema.Struct({ id: AllowanceId, key: AllowanceKey, organization: OrganizationId, member: PersonId, token: TokenAddress, limit: Amount, spent: Amount })` },
    { p: "generated/docs/allowance/index.md", c:
`# allowance
Money a member may spend from their organisation, up to a limit each month.
Lives on chain: AllowanceVault, one per organisation, keyed by key.
Fields: id, key, organization, member, token, limit, spent` } ],
  checked: ["Every field's value decodes with its schema, in every answer that carries it","On chain, every field the contract holds has the Solidity type its value declares","The thing's page shows in the portal, with its operations and machine"] },

{ id: "machine", name: "State machine", file: "things/<thing>/machine.ts",
  rule: "A thing's life: its states, the moves between them, and the event each move emits. States are lowercase words; a move a caller makes is named after the verb of its operation. A move may have more than one outcome. A move made by time says when (every, or after a wait since another move) and how it fires: lazily, worked out the next time the thing is touched, or by the keeper, Architect's built-in caller for time, within a declared lateness. Nothing scans: every wait, the keeper's included, is a timer in the world's Timers service, so a stepped world can move it. A plain sleep in a handler is banned by lint.",
  scaffold: { p: "things/allowance/machine.ts", c:
`export const machine = Blueprint.machine(Allowance, {
  states: ["created"],
  moves: Blueprint.todo("each move: from which states, to which, emitting which event"),
})` },
  filled: { p: "things/allowance/machine.ts", c:
`export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked", "expired"],
  moves: {
    grant:  { from: [], to: "active", emits: Events.AllowanceGranted },
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent },   // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
    // Moved by time, not by a caller.
    reset:  { from: ["active", "exhausted"], to: "active", every: { months: 1, from: "grant" }, fires: "lazy", emits: Events.AllowanceReset },
    expire: { from: ["active", "exhausted"], to: "expired", after: { since: "grant", wait: "1 year" }, fires: "keeper", late: "10 minutes", emits: Events.AllowanceExpired },
  },
  notFrom: { exit: 40 },                       // generates AllowanceNotActive, carrying the state it was in
})` },
  generated: [
    { p: "generated/api/src/allowance/machine.ts", c:
`// Generated from the blueprint. Do not edit.
export type AllowanceState = "active" | "exhausted" | "revoked" | "expired"
// The refusal for a move from the wrong state, which nobody writes by hand:
export class AllowanceNotActive extends Schema.TaggedError<AllowanceNotActive>()("AllowanceNotActive", { state: AllowanceState }) { static readonly exit = 40 }` },
    { p: "generated/contracts/AllowanceMachine.sol", c:
`// Generated from the blueprint. Do not edit.
abstract contract AllowanceMachine {
    function _step(Allowance.State from, Allowance.Move move) internal pure returns (Allowance.State) {
        if (move == Allowance.Move.Revoke && (from == Allowance.State.Active || from == Allowance.State.Exhausted)) return Allowance.State.Revoked;
        // ... one line per move
        revert Allowance.AllowanceNotActive(from);
    }
    // A move with two outcomes: the contract says which, the machine says whether it may.
    function _step(Allowance.State from, Allowance.Move move, Allowance.State to) internal pure returns (Allowance.State) { /* ... */ }
    // A period is a calendar month counted from the grant, never from 1970.
    function _period(uint64 granted) internal view returns (uint64) { return Calendar.monthsBetween(granted, uint64(block.timestamp)); }
}` },
    { p: "generated/keeper/src/allowance.expire.ts", c:
`// Generated from the blueprint. Do not edit.
import { Blueprint } from "@architect/blueprint"
import { Keeper } from "@architect/blueprint/keeper"

// allowance.expire: 1 year after grant, fired by the keeper, at most 10 minutes late.
export default Keeper.move("allowance.expire", {
  // ...
})` },
    { p: "generated/docs/allowance/index.md", c:
`active --spend--> active | exhausted
active, exhausted --revoke--> revoked
active, exhausted --reset (every calendar month from the grant, lazy)--> active
active, exhausted --expire (1 year after grant, keeper)--> expired` } ],
  checked: ["Machine path: every move starts from a state it may start from, and ends in one of its declared outcomes","The thing's events, in order, form a path through its machine","On time: every time move happened when due, within its lateness","Foundry: every move from every state reaches its declared state or reverts AllowanceNotActive","Coverage: every declared move and outcome is reached by some journey"] },

{ id: "event", name: "Event", file: "things/<thing>/events.ts",
  rule: "What a move emits, and exactly what it carries. Named <Thing><PastTense>: AllowanceSpent. Every move names one; an event no move emits fails check. For a thing on chain, the contract emits it, so the same declaration becomes a Solidity event and a decoded Effect value.",
  scaffold: { p: "things/allowance/events.ts", c:
`// One event per move, named <Thing><PastTense>, saying exactly what it carries.
// Declare them as you declare the moves.` },
  filled: { p: "things/allowance/events.ts", c:
`export const AllowanceGranted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount })
export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, to: Address, amount: Amount, remaining: Amount })
export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id })
export const AllowanceReset = Blueprint.event({ allowance: Allowance.fields.id, period: Blueprint.month })
export const AllowanceExpired = Blueprint.event({ allowance: Allowance.fields.id })` },
  generated: [
    { p: "generated/contracts/AllowanceTypes.sol", c:
`// Generated from the blueprint. Do not edit.
    event AllowanceGranted(bytes32 indexed allowance, uint128 limit);
    event AllowanceSpent(bytes32 indexed allowance, address to, uint128 amount, uint128 remaining);
    event AllowanceRevoked(bytes32 indexed allowance);
    event AllowanceReset(bytes32 indexed allowance, uint64 period);
    event AllowanceExpired(bytes32 indexed allowance);` },
    { p: "generated/api/src/allowance/events.ts", c:
`// Generated from the blueprint. Do not edit.
export type AllowanceEvent = AllowanceGranted | AllowanceSpent | AllowanceRevoked | AllowanceReset | AllowanceExpired
// Nobody emits these by hand: the move emits them off chain, the contract on chain, and the receipt is decoded with these schemas.` } ],
  checked: ["Events: each move emitted its declared event, carrying what the declaration says","No undeclared event was emitted","Every event in a transaction's receipt decodes with its schema"] },

{ id: "error", name: "Error", file: "things/<thing>/errors.ts",
  rule: "A refusal that depends on data, named <Thing><Reason>, with what a caller needs to act on it and an exit code. Refusals that depend on state come from the machine; refusals that depend on who is calling, or who signed, come from roles. Neither is declared here. For a thing on chain, each error is also a Solidity custom error, and a revert is decoded back into the typed error.",
  scaffold: { p: "things/allowance/errors.ts", c:
`// Errors that depend on data, named <Thing><Reason>, each with an exit code.
// Refusals from the wrong state are generated from the machine: don't declare those here.` },
  filled: { p: "things/allowance/errors.ts", c:
`export class AllowanceExceeded extends Blueprint.error({ remaining: Amount }, { exit: 41 }) {}
export class AllowanceNotFound extends Blueprint.error({}, { exit: 43 }) {}
export class VaultBalanceLow extends Blueprint.error({ balance: Amount }, { exit: 42 }) {}` },
  generated: [
    { p: "generated/contracts/AllowanceTypes.sol", c:
`// Generated from the blueprint. Do not edit.
    error AllowanceNotActive(State state);      // from machine.ts, notFrom
    error AllowanceExceeded(uint128 remaining); // from errors.ts, exit 41
    error VaultBalanceLow(uint128 balance);     // from errors.ts, exit 42
    error NotOwner(address signer);             // from roles: owner
    error NotSignedBy(address signer);          // a signature from the wrong wallet
    error AlreadyUsed(uint256 nonce);           // idempotent: the same signed request twice
    error SignatureExpired(uint64 deadline);
    error AllowanceNotDue(uint64 due);          // a time move, called early
    error NotKeeper();                          // the keeper only makes time moves` },
    { p: "generated/api/src/allowance/errors.ts", c:
`// Generated from the blueprint. Do not edit.
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", { remaining: Amount }) { static readonly exit = 41 }
export class AllowanceNotFound extends Schema.TaggedError<AllowanceNotFound>()("AllowanceNotFound", {}) { static readonly exit = 43 }` },
    { p: "acme allowance spend alw_7f3 --to 0x5a…c1 --amount 400", c:
`error  AllowanceExceeded   remaining 380   (exit 41)
$ echo $?
41` } ],
  checked: ["Declared errors only: every refusal is a declared error, with its exit code","A contract revert arrives as its typed error, never as an unknown failure","Coverage: every declared error is reached by some journey"] },

{ id: "role", name: "Role", file: "things/<thing>/roles.ts",
  rule: "A right, scoped to one thing and decided by a rule written once. It lives in the folder of the thing it is scoped to: owner and member in organization/, grantee in allowance/. Anyone and signed-in are built in, and so is the keeper. Off chain, a role decides who may call. On chain, an operation's signedBy names a role, and the same role decides whose wallet must sign: the contract checks the signature, so the relayer that submits it can't act alone.",
  scaffold: { p: "things/allowance/roles.ts", c:
`// Roles scoped to one allowance: a rule over the caller and the allowance.
// On chain, an operation's signedBy names one of these: whose wallet must sign.
// Built in, needing no declaration: Blueprint.anyone, Blueprint.signedIn, Blueprint.keeper.` },
  filled: { p: "things/allowance/roles.ts", c:
`// The person the allowance was granted to.
export const grantee = Blueprint.role(Allowance, { rule: (allowance, principal) => allowance.member === principal.person })

// in verbs/spend.ts:
  allowed: [grantee],
  signedBy: grantee,                           // the grantee's own wallet signs the payload` },
  generated: [
    { p: "generated/api/src/allowance/spend.ts", c:
`// From allowed: [grantee]. Answered before the handler runs:
.addError(NotAllowed)      // exit 3
// From signedBy: grantee. The signature must come from the grantee's linked wallet, checked before the handler runs.` },
    { p: "generated/contracts/AllowanceSignatures.sol", c:
`// Generated from the blueprint. Do not edit.
    function _signedBy(bytes32 digest, address signer, bytes calldata sig) internal view {
        if (!SignatureChecker.isValidSignatureNow(signer, digest, sig)) revert Allowance.NotSignedBy(signer);   // EOAs and ERC-1271 accounts
    }` },
    { p: "generated/contracts/test/AllowanceMachine.t.sol", c:
`// Generated from the blueprint. Do not edit.
    // Who signs: every write, signed by any wallet but the declared one, reverts.
    function test_spend_signed_by_stranger_refuses() public {
        vm.expectRevert(abi.encodeWithSelector(Allowance.NotSignedBy.selector, olga));
        vault.spend(_spend(1), _sign(strangerKey, _spend(1)));
    }` },
    { p: "generated/docs/allowance/spend.md", c:
`Who may call: the allowance's grantee, signing with their own wallet.` } ],
  checked: ["Who may call: each operation is called once as someone without the role, and must be refused with NotAllowed","Who signs: each write signed by any wallet but the declared one is refused, off chain and in Foundry","Telemetry records the caller's kind, role and signer on every call"] },

{ id: "operation", name: "Operation", file: "things/<thing>/verbs/<verb>.ts", cmd: "architect add operation allowance.spend",
  rule: "A verb on a thing: payload in, answer out, the errors it may refuse with, the move it makes, who may call it and who signs it, its steps, whether a retry is safe, and its budget. The file's path is its name, allowance.spend; the verb is kebab-case in the path and camelCase in code.",
  scaffold: { p: "things/allowance/verbs/spend.ts", c:
`export default Blueprint.operation(Allowance, {
  description: Blueprint.todo("what spending does, for whoever calls it"),
  payload: Blueprint.todo("what it takes"),
  answer: Blueprint.todo("what it answers"),
  move: machine.moves.spend,             // filled in: the verb matches a move of the machine
  allowed: Blueprint.todo("who may call it"),
  budget: { p95: "500 millis" },
})` },
  filled: { p: "things/allowance/verbs/spend.ts", c:
`export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, to: Address, amount: Amount },
  answer: { remaining: Amount, tx: TxHash },
  move: machine.moves.spend,
  errors: [AllowanceExceeded, AllowanceNotFound, VaultBalanceLow],
  allowed: [grantee],
  signedBy: grantee,                           // the grantee's own wallet signs the payload
  steps: { load: Blueprint.step.database(), submit: Blueprint.step.chain(), confirm: Blueprint.step.wait() },
  idempotent: "request",                       // retried with the same request key, it spends once
  budget: { p95: "4 seconds", excludes: ["allowance.spend.confirm"] },
})` },
  generated: [
    { p: "implementation/handlers/allowance/spend.ts  (a scaffold, then yours)", c:
`export default Handlers.allowance.spend(({ allowance, to, amount }, { steps, vault, signature }) =>
  Effect.gen(function* () {
    const found = yield* steps.load(Blueprint.todo("find the allowance"))
    const sent = yield* steps.submit(Blueprint.todo("send the signed spend to the vault"))
    const receipt = yield* steps.confirm(Blueprint.todo("wait for the receipt"))
    return { remaining: receipt.events.AllowanceSpent.remaining, tx: receipt.hash }
  }))` },
    { p: "generated/api/src/allowance/spend.ts", c:
`HttpApiEndpoint.post("allowance.spend", "/allowance/spend")   // + payload, answer and error schemas, the request key, the signature` },
    { p: "generated/sdk/src/allowance/spend.ts", c:
`acme.allowance.spend({ allowance, to, amount }, { signer })   // Effect<{ remaining, tx }, AllowanceExceeded | VaultBalanceLow | AllowanceNotActive | NotAllowed | ...>` },
    { p: "generated/cli/src/allowance/spend.ts", c:
`$ acme allowance spend alw_7f3 --to 0x5a…c1 --amount 120
signed by  olga (0x71c…9e2)
remaining  380
tx         0x8e1…f02` },
    { p: "generated/docs/allowance/spend.md", c:
`# allowance.spend
Spend from what is left of this month's allowance.` } ],
  checked: ["Answer shape: the answer decodes with its schema","Declared errors only, each with its exit code","Idempotent: the same request key twice spends once, and the same signed request lands once","Who may call, who signs, machine path, events, steps, performance: as declared","Its journeys' value checks"] },

{ id: "read", name: "Read", file: "things/<thing>/verbs/<verb>.ts", cmd: "architect add read allowance.get",
  rule: "A verb that changes nothing. It has no move, no events and no handler: a read of one thing is answered by whoever owns it: the database, its actor, or the contract's own view. A read across things comes from the organisation's index, and a question across every organisation from an export to R2 or D1. It declares which fields, who may read them, and its budget. get finds one by id; list filters, orders and pages.",
  scaffold: { p: "things/allowance/verbs/get.ts", c:
`export default Blueprint.read(Allowance, {
  by: "id",
  fields: Blueprint.todo("which fields it answers with"),
  allowed: Blueprint.todo("who may read it"),
  budget: { p95: "50 millis" },
})` },
  filled: { p: "things/allowance/verbs/get.ts", c:
`export default Blueprint.read(Allowance, {
  by: "id",
  fields: ["organization", "member", "token", "limit", "spent", "state"],
  allowed: [grantee, owner.of("organization")],
  budget: { p95: "300 millis" },               // a contract read
})` },
  generated: [
    { p: "generated/api/src/allowance/get.ts", c:
`HttpApiEndpoint.get("allowance.get", "/allowance/:id")   // answered by Architect: no handler
// on chain: the record's key, then a read of AllowanceVault.allowances(key)` },
    { p: "generated/sdk/src/allowance/get.ts", c:
`acme.allowance.get({ id })   // Effect<{ organization, member, token, limit, spent, state }, AllowanceNotFound | NotAllowed>` },
    { p: "generated/cli/src/allowance/get.ts", c:
`$ acme allowance get alw_7f3
limit  500
spent  120
state  active` } ],
  checked: ["Answer shape: the answer decodes with its schema","Declared errors only: an unknown id is AllowanceNotFound (exit 43)","Who may call: someone without the role is refused","Performance: p50 and p95 against the budget"] },

{ id: "step", name: "Step and telemetry", file: "on each operation: steps",
  rule: "Each step is one span the operation runs through, of a kind: database, chain, site or wait. Named <operation>.<step>. A wait may say how long it may take, and is left out of the budget. Declared steps are how telemetry stays meaningful: every span has a declared name, so every millisecond can be explained.",
  scaffold: { p: "things/allowance/verbs/spend.ts", c:
`  // no steps yet: the operation is one span` },
  filled: { p: "things/allowance/verbs/spend.ts", c:
`  steps: { load: Blueprint.step.database(), submit: Blueprint.step.chain(), confirm: Blueprint.step.wait() },
  budget: { p95: "4 seconds", excludes: ["allowance.spend.confirm"] },` },
  generated: [
    { p: "generated/api/src/allowance/spend.handler.ts", c:
`readonly steps: {
  load: Step<"allowance.spend.load", "database">
  submit: Step<"allowance.spend.submit", "chain">
  confirm: Step<"allowance.spend.confirm", "wait">
}   // wrap code in one and it becomes that span` },
    { p: "a trace in the telemetry sink", c:
`allowance.spend                         1.9 s   outcome=ok  caller.role=grantee  signer=0x71c…9e2
  allowance.spend.load     (database)    18 ms
  allowance.spend.submit   (chain)      410 ms   tx=0x8e1…f02
    vault.spend                         402 ms
      chain.relay                       396 ms
  allowance.spend.confirm  (wait)       1.4 s` } ],
  checked: ["Steps: a span for every declared step whose path ran","Waits: each finished within its declared time","Explainability: the share of the call's time inside declared steps","Performance: p50 and p95 against the budget, waits excluded where declared"] },

{ id: "dependency", name: "Dependency", file: "blueprint/dependencies/<alias>.ts", cmd: "architect add dependency <package> --export <call> --as <alias> --step <kind> --error <file>#<class>",
  rule: "A library you call and don't govern. Its callable owns argument and answer types. You select an installed exact package, export, step kind and existing error classes; Architect writes a pure declaration and a separate runtime wrapper with exactly one blank, the failure mapping. Only the wrapper imports the SDK. Promise mode is the default; explicit Effect mode preserves typed failures, defects and interruption. The generated service adds spans and counted work. D4 is decided; L3.01 implementation and authored runtime checks are still required.",
  scaffold: { p: "src/dependencies/pricing.ts", c:
`// Scaffolded from blueprint/dependencies/pricing.ts. Yours from now on.
import { Blueprint } from "@architect/blueprint"
import { Dependencies } from "@architect/target-effect/runtime"
import { quote as declaration } from "../../blueprint/dependencies/pricing.ts"
import { PriceUnavailable } from "../../blueprint/things/allowance/errors.ts"
import { quote as call } from "@fixture/remote"

export const quote = Dependencies.implementation(declaration, {
  call,
  failure: Blueprint.todo("map the dependency failure to PriceUnavailable"),
})` },
  filled: { p: "blueprint/dependencies/pricing.ts", c:
`// The pure declaration imports Blueprint and declared errors, no SDK:
export const quote = Blueprint.dependency({
  package: "@fixture/remote", version: "1.0.0", mode: "promise",
  errors: [PriceUnavailable], step: "network",
})

// The runtime wrapper's only blank becomes a typed error mapping.
failure: (_failure) => new PriceUnavailable({ reason: "pricing unavailable" })

// A consuming operation declares the dependency by reference.
uses: [quote]

// Promise mode defers interruption until the returned Promise settles.
// It does not claim to cancel arbitrary SDK work. Known cancellable SDKs,
// such as the chain adapter, expose an explicit Effect boundary instead.` },
  generated: [
    { p: "acme/generated/dependencies/pricing.ts", c:
`// Generated from blueprint/dependencies/pricing.ts. Do not edit.
import { quote as implemented } from "../../src/dependencies/pricing.ts"
export class Pricing extends Context.Service<Pricing, {
  readonly quote: Wrapped<typeof implemented>
}>()("dependency:pricing") {}

export const layer = Layer.succeed(Pricing, {
  quote: Dependencies.wrap(implemented, { name: "dependency:pricing.quote" }),
})` } ],
  checked: ["Exactly one failure-mapping blank; argument and answer types come from the library", "Real Promise completion remains counted during cancellation; no manufactured quiet", "Effect typed failures map, while defects and interruption stay intact", "Dependency spans, graph edges and source integrity participate in impact and proof staleness"] },

{ id: "environment", name: "Environment", file: "environments/<name>.ts", cmd: "architect add environment staging",
  rule: "Somewhere the application runs. One file per environment in environments/: local, test, staging, production. Each says how it runs, who the principals are, which cloud it uses, and, as layers add them, its chain, its clock (stepped or real), the secrets it needs by name, and where every output is deployed or published. Evidence and verdicts are kept per environment.",
  scaffold: { p: "environments/staging.ts", c:
`export default Blueprint.environment({
  runs: Blueprint.todo("always on, or a fresh world per pull request"),
  identity: Blueprint.todo("Identity.betterAuth or Identity.testPrincipals"),
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  deploy: Blueprint.todo("where each output that runs goes"),
})` },
  filled: { p: "environments/staging.ts", c:
`export default Blueprint.environment({
  runs: "always on",
  identity: Identity.betterAuth,
  cloud: Cloud.cloudflare({ database: Cloud.d1() }),
  clock: "real",
  chain: Chain.network("base-sepolia"),
  secrets: { RELAYER_KEY: Blueprint.secret.stored() },     // named here; the value lives in the environment
  deploy: {
    server: Deploy.worker({ domain: "api.staging.acme.dev" }),
    mcp: Deploy.worker({ domain: "mcp.staging.acme.dev" }),
    portal: Deploy.site({ domain: "staging.acme.dev" }),
    contracts: Deploy.contracts({ verify: true }),
    keeper: Deploy.timers(),                      // the keeper's alarms, one per thing
  },
  publish: { sdk: Deploy.npm({ tag: "next" }), cli: Deploy.npm({ tag: "next" }) },
})` },
  generated: [
    { p: "generated/infra/src/staging.ts", c:
`const vaults = await Chain.factory("AllowanceVault", { network: "base-sepolia", verify: true })
await Worker("server", { domain: "api.staging.acme.dev", bindings: { db, vaults } })
// ... mcp, the keeper's timers, portal` },
    { p: "portal: allowance.spend", c:
`local ✔   test ✔   staging ✔   production —` } ],
  checked: ["Every verdict names its environment","Proven in one environment says nothing about another","Every secret it names has a value before it deploys"] },

{ id: "journey", name: "Journey", file: "journeys/<journey>.ts", cmd: "architect add journey monthly-reset",
  rule: "A short story, played by a cast, through real operations, that produces the evidence. Its name is its file's name. Each person in the cast signs with their own test wallet. A journey can move the world's clock: in a stepped world the world's own Durable Object steps time like a simulation, firing each due timer, moving the chain's time with it, and waiting until the world is quiet before the next step. The builder of an operation never writes its journeys.",
  scaffold: { p: "journeys/monthly-reset.ts", c:
`export default Blueprint.journey({
  cast: Blueprint.todo("who plays it: a role for each person"),
  starts: Blueprint.todo("the starting world"),
  steps: Blueprint.todo("each step: an operation called by someone, or the clock moving, and what you expect"),
})` },
  filled: { p: "journeys/monthly-reset.ts", c:
`export default Blueprint.journey({
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("olga spends it all", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 500n })),
    s.step("a month passes", s.clock.advance("1 month")),          // the chain's time moves with it
    s.step("the allowance is back", s.olga.allowance.get({ id: s.world.allowance }),
      expect((a) => [a.state, a.spent]).toEqual(["active", 0n])),
    s.step("a year passes", s.clock.advance("1 year")),             // the keeper expires it on time
    s.step("it has expired", s.olga.allowance.get({ id: s.world.allowance }),
      expect((a) => a.state).toBe("expired")),
  ],
})` },
  generated: [
    { p: "architect prove --env local", c:
`journey  monthly-reset   ✔  5 steps   clock +1 month, +1 year
allowance.reset    lazy, on time ✔
allowance.expire   keeper, on time ✔ 3m late (10m allowed)` } ],
  checked: ["Every step and every expectation passes","Every operation it calls gets all its built-in evals run on this evidence","Every time move it waits for happened on time"] },

{ id: "starting-world", name: "Starting world", file: "starting-worlds/<name>.ts",
  rule: "A named state a journey can start from, named for what's true in it: funded means an allowance is granted and, on chain, the organisation's vault holds money. It builds on another world and is seeded by running declared operations, the same way the system is used. Once things live on chain it spans systems: vaults deployed and funded, and the clock at a known time.",
  scaffold: { p: "starting-worlds/funded.ts", c:
`export default Blueprint.world({
  from: founded,
  run: Blueprint.todo("the declared operations that make it true"),
})` },
  filled: { p: "starting-worlds/funded.ts", c:
`export default Blueprint.world({
  from: founded,                               // ada owns acme-demo; olga is a member
  clock: "2026-11-01T09:00:00Z",               // a stepped world starts at a known time
  chain: {
    deploy: { AllowanceVault: { for: "acme-demo", owners: ["ada"] } },
    fund: { vault: "acme-demo", token: "TestUSD", amount: 10_000n },
  },
  run: (w) => [
    w.ada.allowance.grant({ organization: w.organization, member: w.olga.person, token: w.TestUSD, limit: 500n }),
  ],
})` },
  generated: [
    { p: "a snapshot, made once per run", c:
`funded  saved after founded, a vault deploy and a grant; restored before each journey that starts from it
chain   anvil state saved with it, so the clock and the blocks restore together` } ],
  checked: ["The chain and the database agree when it's restored","What it grants is made through declared operations, so those are exercised too"] },
];
const STAGES = [["rule", "The convention"], ["scaffold", "Scaffolded"], ["filled", "Filled in"], ["generated", "Generated"], ["checked", "Checked"]];
function lifecycleHtml(item) {
  const tabs = STAGES.map(([k, label], i) => '<button type="button" role="tab" data-stage="' + k + '" aria-selected="' + (i === 0) + '"><span>' + (i + 1) + "</span>" + label + "</button>").join("");
  return '<div class="life" data-item="' + item.id + '"><div class="life-head"><h3>' + esc(item.name) + '</h3><code>' + esc(item.file) + "</code></div>" +
    '<div class="life-tabs" role="tablist">' + tabs + '</div><div class="life-body"></div></div>';
}
function lifecycleStage(item, stage) {
  if (stage === "rule") return '<p class="life-rule">' + esc(item.rule) + "</p>" + (item.cmd ? '<pre class="code term">' + highlight(item.cmd, "bash") + "</pre>" : "");
  if (stage === "scaffold" || stage === "filled") {
    const f = item[stage];
    const label = stage === "scaffold" ? "What the scaffold writes: highlighted lines are the blanks." : "What the agent fills in.";
    return '<p class="life-rule">' + label + '</p><div class="path">' + esc(f.p) + '</div><pre class="code">' + highlight(f.c, langOf(f.p)) + "</pre>";
  }
  if (stage === "generated") return '<p class="life-rule">What appears once it is filled in, without anyone writing it.</p>' + item.generated.map((g) =>
    '<div class="path">' + esc(g.p) + '</div><pre class="code">' + highlight(g.c, langOf(g.p.split(" ")[0])) + "</pre>").join("");
  return '<p class="life-rule">What the built-in evals check, every run, in every environment.</p><ul>' + item.checked.map((c) => "<li>" + esc(c) + "</li>").join("") + "</ul>";
}
function mountLifecycles(root) {
  const el = root.querySelector("[data-life]");
  if (!el) return;
  el.innerHTML = LIFECYCLE.map(lifecycleHtml).join("");
  el.querySelectorAll(".life").forEach((card) => {
    const item = LIFECYCLE.find((x) => x.id === card.dataset.item);
    const body = card.querySelector(".life-body");
    const select = (stage) => {
      card.querySelectorAll("[data-stage]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.stage === stage)));
      body.innerHTML = lifecycleStage(item, stage);
    };
    card.querySelector(".life-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-stage]"); if (b) select(b.dataset.stage); });
    select("rule");
  });
}
