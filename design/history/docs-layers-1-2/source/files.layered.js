/* ===== The worked example, written once with its layers =====
   A line ending «n» first appears in layer n; a line ending «-n» is there until layer n replaces it.
   at(path, n) is the file as it stands after layer n; at(path, n, true) marks layer n's changes with "+ " and "- ". */
const LAYERED = {
"acme/blueprint/values/money.ts": { k: "scaffold", n: "Values are the named types fields are made of. Once a thing lives on chain, each value also says what it is in Solidity.", c:
`import { Blueprint } from "@architect/blueprint"

export const Amount = Blueprint.value(Blueprint.uint(128)) «-4»
export const Amount = Blueprint.value(Blueprint.uint(128), { solidity: "uint128" })   // a bigint in Effect «4»
export const Memo = Blueprint.value(Blueprint.text({ max: 140 })) «-4»` },

"acme/blueprint/values/chain.ts": { k: "scaffold", n: "The chain's values, from the standard library's chain kit: each with its Solidity type.", c:
`import { Blueprint } from "@architect/blueprint"

export const Address = Blueprint.value(Blueprint.hex(20), { solidity: "address" })
export const TokenAddress = Blueprint.value(Address, { solidity: "address" })
export const AllowanceKey = Blueprint.value(Blueprint.hex(32), { solidity: "bytes32" })
export const TxHash = Blueprint.value(Blueprint.hex(32), { solidity: "bytes32" })` },

"acme/blueprint/things/allowance/thing.ts": { k: "scaffold", n: "A thing. In layer one it lives in the database; layer four moves it on chain with one line and two fields.", c:
`import { Blueprint } from "@architect/blueprint"
import { Organization } from "../organization/thing"
import { Person } from "../person/thing"
import { Amount } from "../../values/money"
import { AllowanceKey, TokenAddress } from "../../values/chain" «4»

export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation, up to a limit each month.",
  fields: {
    id: Blueprint.id("alw"),
    key: AllowanceKey,                         // its id on chain «4»
    organization: Organization.fields.id,
    member: Person.fields.id,
    token: TokenAddress, «4»
    limit: Amount,
    spent: Amount,
  },
  lives: Blueprint.chain({ contract: "AllowanceVault", key: "key", per: "organization" }),   // one vault per organisation «4»
})` },

"acme/blueprint/things/allowance/machine.ts": { k: "scaffold", n: "The allowance's life. spend has two outcomes. Layer five adds two moves made by time: reset, every calendar month counted from the grant and fired lazily, and expire, a year after the grant, fired by the keeper through the world's timers.", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "./thing"
import * as Events from "./events"

export const machine = Blueprint.machine(Allowance, {
  states: ["active", "exhausted", "revoked"], «-5»
  states: ["active", "exhausted", "revoked", "expired"], «5»
  moves: {
    grant:  { from: [], to: "active", emits: Events.AllowanceGranted },
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: Events.AllowanceSpent },   // two outcomes
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: Events.AllowanceRevoked },
    // Moved by time, not by a caller. «5»
    reset:  { from: ["active", "exhausted"], to: "active", every: { months: 1, from: "grant" }, fires: "lazy", emits: Events.AllowanceReset }, «5»
    expire: { from: ["active", "exhausted"], to: "expired", after: { since: "grant", wait: "1 year" }, fires: "keeper", late: "10 minutes", emits: Events.AllowanceExpired }, «5»
  },
  notFrom: { exit: 40 },                       // generates AllowanceNotActive, carrying the state it was in
})` },

"acme/blueprint/things/allowance/events.ts": { k: "scaffold", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "./thing"
import { Amount, Memo } from "../../values/money" «-4»
import { Amount } from "../../values/money" «4»
import { Address } from "../../values/chain" «4»

export const AllowanceGranted = Blueprint.event({ allowance: Allowance.fields.id, limit: Amount })
export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, amount: Amount, memo: Memo, remaining: Amount }) «-4»
export const AllowanceSpent = Blueprint.event({ allowance: Allowance.fields.id, to: Address, amount: Amount, remaining: Amount }) «4»
export const AllowanceRevoked = Blueprint.event({ allowance: Allowance.fields.id })
export const AllowanceReset = Blueprint.event({ allowance: Allowance.fields.id, period: Blueprint.month }) «5»
export const AllowanceExpired = Blueprint.event({ allowance: Allowance.fields.id }) «5»` },

"acme/blueprint/things/allowance/errors.ts": { k: "scaffold", n: "Refusals that depend on data. The machine's own refusal, AllowanceNotActive, is generated and never written here.", c:
`import { Blueprint } from "@architect/blueprint"
import { Amount } from "../../values/money"

export class AllowanceExceeded extends Blueprint.error({ remaining: Amount }, { exit: 41 }) {}
export class AllowanceNotFound extends Blueprint.error({}, { exit: 43 }) {}
export class VaultBalanceLow extends Blueprint.error({ balance: Amount }, { exit: 42 }) {} «4»` },

"acme/blueprint/things/allowance/roles.ts": { k: "scaffold", n: "Who may call. The same role decides who must sign once the allowance is on chain: the contract checks the signature belongs to the grantee's wallet.", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "./thing"

// The person the allowance was granted to.
export const grantee = Blueprint.role(Allowance, { rule: (allowance, principal) => allowance.member === principal.person })` },

"acme/blueprint/things/allowance/verbs/grant.ts": { k: "scaffold", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "../thing"
import { machine } from "../machine"
import { owner } from "../../organization/roles"

export default Blueprint.operation(Allowance, {
  description: "Let a member spend from the organisation, up to a limit each month.",
  payload: { organization: Allowance.fields.organization, member: Allowance.fields.member, limit: Allowance.fields.limit }, «-4»
  payload: { organization: Allowance.fields.organization, member: Allowance.fields.member, token: Allowance.fields.token, limit: Allowance.fields.limit }, «4»
  answer: { allowance: Allowance.fields.id },
  move: machine.moves.grant,
  allowed: [owner.of("organization")],
  signedBy: owner,                             // the owner's wallet signs; the relayer only pays the gas «4»
  steps: { insert: Blueprint.step.database() }, «-4»
  steps: { insert: Blueprint.step.database(), submit: Blueprint.step.chain(), confirm: Blueprint.step.wait() }, «4»
  idempotent: "request",                       // the same request twice grants once
  budget: { p95: "200 millis" }, «-4»
  budget: { p95: "3 seconds", excludes: ["allowance.grant.confirm"] }, «4»
})` },

"acme/blueprint/things/allowance/verbs/spend.ts": { k: "scaffold", n: "The richest operation in the example: a data refusal, a machine refusal, idempotency, and from layer four a signature, a chain step and a wait.", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "../thing"
import { machine } from "../machine"
import { grantee } from "../roles"
import { AllowanceExceeded, AllowanceNotFound } from "../errors" «-4»
import { AllowanceExceeded, AllowanceNotFound, VaultBalanceLow } from "../errors" «4»
import { Amount, Memo } from "../../../values/money" «-4»
import { Amount } from "../../../values/money" «4»
import { Address, TxHash } from "../../../values/chain" «4»

export default Blueprint.operation(Allowance, {
  description: "Spend from what is left of this month's allowance.",
  payload: { allowance: Allowance.fields.id, amount: Amount, memo: Memo }, «-4»
  answer: { remaining: Amount }, «-4»
  payload: { allowance: Allowance.fields.id, to: Address, amount: Amount }, «4»
  answer: { remaining: Amount, tx: TxHash }, «4»
  move: machine.moves.spend,
  errors: [AllowanceExceeded, AllowanceNotFound], «-4»
  errors: [AllowanceExceeded, AllowanceNotFound, VaultBalanceLow], «4»
  allowed: [grantee],
  signedBy: grantee,                           // the grantee's own wallet signs the payload «4»
  steps: { load: Blueprint.step.database(), record: Blueprint.step.database() }, «-4»
  steps: { load: Blueprint.step.database(), submit: Blueprint.step.chain(), confirm: Blueprint.step.wait() }, «4»
  idempotent: "request",                       // retried with the same request key, it spends once
  budget: { p95: "150 millis" }, «-4»
  budget: { p95: "4 seconds", excludes: ["allowance.spend.confirm"] }, «4»
})` },

"acme/blueprint/things/allowance/verbs/revoke.ts": { k: "scaffold", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "../thing"
import { machine } from "../machine"
import { owner } from "../../organization/roles"

export default Blueprint.operation(Allowance, {
  description: "Stop an allowance. Nothing more can be spent from it.",
  payload: { allowance: Allowance.fields.id },
  answer: {},
  move: machine.moves.revoke,
  allowed: [owner.of("allowance.organization")],
  signedBy: owner, «4»
  steps: { update: Blueprint.step.database() }, «-4»
  steps: { submit: Blueprint.step.chain(), confirm: Blueprint.step.wait() }, «4»
  budget: { p95: "150 millis" }, «-4»
  budget: { p95: "3 seconds", excludes: ["allowance.revoke.confirm"] }, «4»
})` },

"acme/blueprint/things/allowance/verbs/get.ts": { k: "scaffold", n: "A read. It changes nothing, so it has no move and no handler. In layer one it reads the database; on chain, it reads the contract's own view.", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "../thing"
import { grantee } from "../roles"
import { owner } from "../../organization/roles"

export default Blueprint.read(Allowance, {
  by: "id",
  fields: ["organization", "member", "limit", "spent", "state"], «-4»
  fields: ["organization", "member", "token", "limit", "spent", "state"], «4»
  allowed: [grantee, owner.of("organization")],
  budget: { p95: "50 millis" }, «-4»
  budget: { p95: "300 millis" },               // a contract read «4»
})` },

"acme/blueprint/things/allowance/verbs/list.ts": { k: "scaffold", n: "", c:
`import { Blueprint } from "@architect/blueprint"
import { Allowance } from "../thing"
import { owner } from "../../organization/roles"

export default Blueprint.read(Allowance, {
  where: ["organization", "member", "state"],
  order: "newest",
  page: 50,
  allowed: [owner.of("organization")],
  budget: { p95: "100 millis" },
})` },

"acme/blueprint/kits/wallets.ts": { k: "scaffold", n: "The standard library's wallets kit: how a person proves an address is theirs, and which signer each caller uses. Swapping a local key for a browser wallet or a smart account is a change here, not in the contract.", c:
`import { Blueprint } from "@architect/blueprint"
import { Wallets } from "@architect/std"

export default Blueprint.use(Wallets, {
  link: Wallets.signInWithEthereum,            // a person proves an address is theirs (Better Auth's SIWE plugin)
  signers: {
    cli: Wallets.localKey({ keystore: "~/.acme/keys" }),
    sdk: Wallets.anySigner,                    // the caller passes one: a local key, a browser wallet, a smart account
    journeys: Wallets.testKeys,                // every test person gets a wallet in each world
  },
})` },

"acme/blueprint/kits/chain.ts": { k: "scaffold", n: "The standard library's chain kit: the chain client (viem, wrapped once by the standard library), the relayer, and the chain's values.", c:
`import { Blueprint } from "@architect/blueprint"
import { Chain } from "@architect/std"

export default Blueprint.use(Chain, {
  relayer: { key: Blueprint.secret("RELAYER_KEY"), pays: "gas" },   // submits signed payloads; can't act alone
  values: "../values/chain.ts",
})` },

"acme/blueprint/starting-worlds/funded.ts": { k: "scaffold", n: "A starting world. It runs declared operations, so it's seeded the same way the system is used. From layer four it spans the database and the chain.", c:
`import { Blueprint } from "@architect/blueprint"
import founded from "./founded"

export default Blueprint.world({
  from: founded,                               // ada owns acme-demo; olga is a member
  clock: "2026-11-01T09:00:00Z",               // a stepped world starts at a known time «5»
  chain: { «4»
    deploy: { AllowanceVault: { for: "acme-demo", owners: ["ada"] } }, «4»
    fund: { vault: "acme-demo", token: "TestUSD", amount: 10_000n }, «4»
  }, «4»
  run: (w) => [
    w.ada.allowance.grant({ organization: w.organization, member: w.olga.person, limit: 500n }), «-4»
    w.ada.allowance.grant({ organization: w.organization, member: w.olga.person, token: w.TestUSD, limit: 500n }), «4»
  ],
})` },

"acme/blueprint/journeys/spend-within-allowance.ts": { k: "scaffold", n: "", c:
`import { Blueprint, expect, refuses } from "@architect/blueprint"
import { grantee } from "../things/allowance/roles"
import { machine } from "../things/allowance/machine"
import { AllowanceExceeded } from "../things/allowance/errors"

export default Blueprint.journey({
  cast: { olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("olga spends some", s.olga.allowance.spend({ allowance: s.world.allowance, amount: 120n, memo: "train" }), «-4»
    s.step("olga spends some", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 120n }), «4»
      expect((a) => a.remaining).toBe(380n)),
    s.step("olga can't spend more than is left", s.olga.allowance.spend({ allowance: s.world.allowance, amount: 400n, memo: "hotel" }), «-4»
    s.step("olga can't spend more than is left", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 400n }), «4»
      refuses(AllowanceExceeded, { remaining: 380n })),
    s.step("olga spends the rest", s.olga.allowance.spend({ allowance: s.world.allowance, amount: 380n, memo: "hotel" }), «-4»
    s.step("olga spends the rest", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 380n }), «4»
      expect((a) => a.remaining).toBe(0n)),
    s.step("nothing is left this month", s.olga.allowance.spend({ allowance: s.world.allowance, amount: 1n, memo: "coffee" }), «-4»
    s.step("nothing is left this month", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 1n }), «4»
      refuses(machine.notFrom)),
  ],
})` },

"acme/blueprint/journeys/revoke-then-spend.ts": { k: "scaffold", n: "", c:
`import { Blueprint, refuses } from "@architect/blueprint"
import { owner } from "../things/organization/roles"
import { grantee } from "../things/allowance/roles"
import { machine } from "../things/allowance/machine"

export default Blueprint.journey({
  cast: { ada: owner, olga: grantee },
  starts: "funded",
  steps: (s) => [
    s.step("ada revokes it", s.ada.allowance.revoke({ allowance: s.world.allowance })),
    s.step("olga can't spend", s.olga.allowance.spend({ allowance: s.world.allowance, amount: 1n, memo: "coffee" }), «-4»
    s.step("olga can't spend", s.olga.allowance.spend({ allowance: s.world.allowance, to: s.world.bob, amount: 1n }), «4»
      refuses(machine.notFrom, { state: "revoked" })),
    s.step("olga can't revoke it either", s.olga.allowance.revoke({ allowance: s.world.allowance }),
      refuses(Blueprint.NotAllowed)),
  ],
})` },

"acme/blueprint/journeys/monthly-reset.ts": { k: "scaffold", n: "A journey that moves the clock. In a stepped world, the clock moves the server, the database and the chain together.", c:
`import { Blueprint, expect } from "@architect/blueprint"
import { grantee } from "../things/allowance/roles"

export default Blueprint.journey({
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

"acme/implementation/handlers/allowance/spend.ts": { k: "scaffold", n: "The handler. The role check, the idempotency key, the move and its event happen around it. From layer four, the signature arrives already checked, and the contract's refusals arrive decoded.", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"
import { Allowances } from "../../services"
import { AllowanceExceeded } from "@acme/blueprint/things/allowance/errors" «-4»

export default Handlers.allowance.spend(({ allowance, amount, memo }, { steps, move }) => «-4»
export default Handlers.allowance.spend(({ allowance, to, amount }, { steps, vault, signature }) => «4»
  Effect.gen(function* () {
    const found = yield* steps.load(Allowances.find(allowance))                   // fails AllowanceNotFound
    const remaining = found.limit - found.spent «-4»
    if (amount > remaining) return yield* new AllowanceExceeded({ remaining })    // writes the deciding log «-4»
    yield* steps.record(Allowances.spend(found.id, amount, memo)) «-4»
    yield* move(found, amount === remaining ? "exhausted" : "active")              // the move, its event, the new state «-4»
    return { remaining: remaining - amount } «-4»
    const sent = yield* steps.submit(vault.spend({ allowance: found.key, to, amount }, signature))   // the relayer pays the gas «4»
    // AllowanceExceeded, VaultBalanceLow and AllowanceNotActive arrive decoded from the contract «4»
    const receipt = yield* steps.confirm(sent.receipt) «4»
    return { remaining: receipt.events.AllowanceSpent.remaining, tx: receipt.hash } «4»
  }))` },

"acme/implementation/handlers/allowance/grant.ts": { k: "scaffold", n: "", c:
`import { Effect } from "effect"
import { Handlers } from "@acme/api/server"
import { Allowances } from "../../services"

export default Handlers.allowance.grant((payload, { steps, move }) => «-4»
export default Handlers.allowance.grant((payload, { steps, vault, signature }) => «4»
  Effect.gen(function* () {
    const allowance = yield* steps.insert(Allowances.insert(payload))
    yield* move(allowance) «-4»
    const sent = yield* steps.submit(vault.grant({ allowance: allowance.key, member: allowance.memberWallet, token: payload.token, limit: payload.limit }, signature)) «4»
    yield* steps.confirm(sent.receipt) «4»
    return { allowance: allowance.id }
  }))` },

"acme/implementation/services.ts": { k: "scaffold", n: "Your own Effect services. Each function is a span named by a declared step.", c:
`import { Effect, Layer } from "effect"
import { SqlClient } from "@effect/sql"

// Your own Effect services. Each function is a span named by a declared step.
export class Allowances extends Effect.Service<Allowances>()("acme/Allowances", { /* find, insert, spend */ }) {} «1»
export class Memberships extends Effect.Service<Memberships>()("acme/Memberships", { /* ... */ }) {}
export class Organizations extends Effect.Service<Organizations>()("acme/Organizations", { /* ... */ }) {}
export class Database extends Effect.Service<Database>()("acme/Database", { /* ... */ }) {}` },

"acme/implementation/contracts/AllowanceVault.sol": { k: "scaffold", n: "Our contract, one per organisation. Every write checks a signature from the right wallet, through the generated helpers; state only changes through the generated machine.", c:
`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Allowance} from "../../generated/contracts/AllowanceTypes.sol";
import {AllowanceMachine} from "../../generated/contracts/AllowanceMachine.sol";
import {AllowanceSignatures} from "../../generated/contracts/AllowanceSignatures.sol";

contract AllowanceVault is AllowanceMachine, AllowanceSignatures {
    using SafeERC20 for IERC20;

    struct Record { address member; address token; uint128 limit; uint128 spent; uint64 period; uint64 granted; Allowance.State state; }

    mapping(bytes32 => Record) public allowances;
    mapping(address => bool) public isOwner;
    address public immutable keeper;                         // may make the time moves, nothing else «5»

    constructor(address[] memory owners) AllowanceSignatures("AllowanceVault") { «-5»
    constructor(address[] memory owners, address keeper_) AllowanceSignatures("AllowanceVault") { «5»
        for (uint256 i; i < owners.length; i++) isOwner[owners[i]] = true;
        keeper = keeper_; «5»
    }

    function grant(Grant calldata g, bytes calldata sig) external {
        _signedBy(_hashGrant(g), g.owner, sig);                 // the owner's wallet, or their smart account
        if (!isOwner[g.owner]) revert Allowance.NotOwner(g.owner);
        _useNonce(g.owner, g.nonce, g.deadline);
        Record storage a = allowances[g.allowance];
        a.state = _step(a.state, Allowance.Move.Grant);
        (a.member, a.token, a.limit, a.granted) = (g.member, g.token, g.limit, uint64(block.timestamp));
        a.period = 0;                                           // calendar months since the grant «5»
        emit Allowance.AllowanceGranted(g.allowance, g.limit);
    }

    function spend(Spend calldata s, bytes calldata sig) external returns (uint128 remaining) {
        Record storage a = allowances[s.allowance];
        _signedBy(_hashSpend(s), a.member, sig);                // only the grantee's wallet
        _useNonce(a.member, s.nonce, s.deadline);               // the same signed spend can't land twice
        _due(s.allowance, a);                                   // lazy moves first: a new month resets it «5»
        uint128 left = a.limit - a.spent;
        if (s.amount > left) revert Allowance.AllowanceExceeded(left);
        uint256 balance = IERC20(a.token).balanceOf(address(this));
        if (s.amount > balance) revert Allowance.VaultBalanceLow(uint128(balance));
        a.state = _step(a.state, Allowance.Move.Spend, s.amount == left ? Allowance.State.Exhausted : Allowance.State.Active);
        a.spent += s.amount;
        IERC20(a.token).safeTransfer(s.to, s.amount);
        emit Allowance.AllowanceSpent(s.allowance, s.to, s.amount, left - s.amount);
        return left - s.amount;
    }

    function revoke(Revoke calldata r, bytes calldata sig) external {
        _signedBy(_hashRevoke(r), r.owner, sig);
        if (!isOwner[r.owner]) revert Allowance.NotOwner(r.owner);
        _useNonce(r.owner, r.nonce, r.deadline);
        Record storage a = allowances[r.allowance];
        a.state = _step(a.state, Allowance.Move.Revoke);
        emit Allowance.AllowanceRevoked(r.allowance);
    }

    function expire(bytes32 key) external { «5»
        if (msg.sender != keeper) revert Allowance.NotKeeper(); «5»
        Record storage a = allowances[key]; «5»
        _dueAfter(a.granted, 365 days);                         // generated: reverts AllowanceNotDue if early «5»
        a.state = _step(a.state, Allowance.Move.Expire); «5»
        emit Allowance.AllowanceExpired(key); «5»
    } «5»

    function _due(bytes32 key, Record storage a) internal { «5»
        uint64 period = _period(a.granted);                     // whole calendar months since the grant «5»
        if (period != a.period && (a.state == Allowance.State.Active || a.state == Allowance.State.Exhausted)) { «5»
            a.state = _step(a.state, Allowance.Move.Reset); «5»
            (a.spent, a.period) = (0, period); «5»
            emit Allowance.AllowanceReset(key, period); «5»
        } «5»
    } «5»
}` },

"acme/generated/contracts/AllowanceTypes.sol": { k: "generated", n: "The Solidity target's types, from the blueprint: the states and moves, the events and the errors, in the values' Solidity types.", c:
`// Generated from the blueprint. Do not edit.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Allowance {
    enum State { None, Active, Exhausted, Revoked } «-5»
    enum Move { Grant, Spend, Revoke } «-5»
    enum State { None, Active, Exhausted, Revoked, Expired } «5»
    enum Move { Grant, Spend, Revoke, Reset, Expire } «5»

    event AllowanceGranted(bytes32 indexed allowance, uint128 limit);
    event AllowanceSpent(bytes32 indexed allowance, address to, uint128 amount, uint128 remaining);
    event AllowanceRevoked(bytes32 indexed allowance);
    event AllowanceReset(bytes32 indexed allowance, uint64 period); «5»
    event AllowanceExpired(bytes32 indexed allowance); «5»

    error AllowanceNotActive(State state);      // from machine.ts, notFrom
    error AllowanceExceeded(uint128 remaining); // from errors.ts, exit 41
    error VaultBalanceLow(uint128 balance);     // from errors.ts, exit 42
    error NotOwner(address signer);             // from roles: owner
    error NotSignedBy(address signer);          // a signature from the wrong wallet
    error AlreadyUsed(uint256 nonce);           // idempotent: the same signed request twice
    error SignatureExpired(uint64 deadline);
    error AllowanceNotDue(uint64 due);          // a time move, called early «5»
    error NotKeeper();                          // the keeper only makes time moves «5»
}` },

"acme/generated/contracts/AllowanceMachine.sol": { k: "generated", n: "The machine, compiled. The contract can only change state through _step, so it can't move any way the blueprint doesn't allow.", c:
`// Generated from the blueprint. Do not edit.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Allowance} from "./AllowanceTypes.sol";
import {Calendar} from "./Calendar.sol"; «5»

abstract contract AllowanceMachine {
    function _step(Allowance.State from, Allowance.Move move) internal pure returns (Allowance.State) {
        if (move == Allowance.Move.Grant && from == Allowance.State.None) return Allowance.State.Active;
        if (move == Allowance.Move.Revoke && (from == Allowance.State.Active || from == Allowance.State.Exhausted)) return Allowance.State.Revoked;
        if (move == Allowance.Move.Reset && (from == Allowance.State.Active || from == Allowance.State.Exhausted)) return Allowance.State.Active; «5»
        if (move == Allowance.Move.Expire && (from == Allowance.State.Active || from == Allowance.State.Exhausted)) return Allowance.State.Expired; «5»
        revert Allowance.AllowanceNotActive(from);
    }

    // A move with two outcomes: the contract says which, the machine says whether it may.
    function _step(Allowance.State from, Allowance.Move move, Allowance.State to) internal pure returns (Allowance.State) {
        if (move == Allowance.Move.Spend && from == Allowance.State.Active && (to == Allowance.State.Active || to == Allowance.State.Exhausted)) return to;
        revert Allowance.AllowanceNotActive(from);
    }

    // Time, in the chain's own clock. A stepped world moves block.timestamp with the world's clock. «5»
    // A period is a calendar month counted from the grant, never from 1970. «5»
    function _period(uint64 granted) internal view returns (uint64) { return Calendar.monthsBetween(granted, uint64(block.timestamp)); } «5»
    function _dueAfter(uint64 since, uint64 wait) internal view { «5»
        if (block.timestamp < since + wait) revert Allowance.AllowanceNotDue(since + wait); «5»
    } «5»
}` },

"acme/generated/contracts/Calendar.sol": { k: "generated", n: "Calendar months in the chain's own clock, so the monthly reset falls on the same day and time each month after the grant.", c:
`// Generated from the blueprint. Do not edit.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Dates from a UNIX time, with Howard Hinnant's civil-from-days algorithm (public domain), in UTC.
library Calendar {
    function ymd(uint64 t) internal pure returns (int256 y, uint256 m, uint256 d, uint256 secs) {
        int256 z = int256(uint256(t / 1 days)) + 719468;
        int256 era = z / 146097;
        uint256 doe = uint256(z - era * 146097);
        uint256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        uint256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        uint256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        y = int256(yoe) + era * 400 + (m <= 2 ? int256(1) : int256(0));
        secs = t % 1 days;
    }

    // Whole calendar months from \`from\` to \`to\`. A grant on the 31st turns over on the 1st after a shorter month.
    function monthsBetween(uint64 from, uint64 to) internal pure returns (uint64) {
        if (to <= from) return 0;
        (int256 y1, uint256 m1, uint256 d1, uint256 s1) = ymd(from);
        (int256 y2, uint256 m2, uint256 d2, uint256 s2) = ymd(to);
        int256 n = (y2 - y1) * 12 + int256(m2) - int256(m1);
        if (d2 < d1 || (d2 == d1 && s2 < s1)) n -= 1;
        return uint64(uint256(n));
    }
}` },

"acme/generated/contracts/AllowanceSignatures.sol": { k: "generated", n: "What each person signs, generated from each operation's payload as EIP-712 typed data. SignatureChecker accepts a plain wallet's signature and a smart account's alike, so the signer can change without touching the contract.", c:
`// Generated from the blueprint. Do not edit.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {Allowance} from "./AllowanceTypes.sol";

abstract contract AllowanceSignatures is EIP712 {
    // From verbs/spend.ts: its payload, plus who signs, a nonce and a deadline.
    struct Spend { bytes32 allowance; address to; uint128 amount; uint256 nonce; uint64 deadline; }
    struct Grant { bytes32 allowance; address owner; address member; address token; uint128 limit; uint256 nonce; uint64 deadline; }
    struct Revoke { bytes32 allowance; address owner; uint256 nonce; uint64 deadline; }

    bytes32 private constant SPEND = keccak256("Spend(bytes32 allowance,address to,uint128 amount,uint256 nonce,uint64 deadline)");
    // GRANT, REVOKE: the same shape

    mapping(address => mapping(uint256 => bool)) private _used;

    constructor(string memory name) EIP712(name, "1") {}

    function _hashSpend(Spend calldata s) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(SPEND, s.allowance, s.to, s.amount, s.nonce, s.deadline)));
    }
    // _hashGrant, _hashRevoke: the same shape

    function _signedBy(bytes32 digest, address signer, bytes calldata sig) internal view {
        if (!SignatureChecker.isValidSignatureNow(signer, digest, sig)) revert Allowance.NotSignedBy(signer);   // EOAs and ERC-1271 accounts
    }

    function _useNonce(address signer, uint256 nonce, uint64 deadline) internal {
        if (block.timestamp > deadline) revert Allowance.SignatureExpired(deadline);
        if (_used[signer][nonce]) revert Allowance.AlreadyUsed(nonce);
        _used[signer][nonce] = true;
    }
}` },

"acme/generated/contracts/test/AllowanceMachine.t.sol": { k: "generated", n: "The conformance tests, in Foundry: every move from every state, every write signed by the wrong wallet, and every signature replayed.", c:
`// Generated from the blueprint. Do not edit.
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AllowanceVault} from "../../../implementation/contracts/AllowanceVault.sol";
import {Allowance} from "../AllowanceTypes.sol";

contract AllowanceMachineTest is Test {
    // Every move from every state: it reaches the declared state, or reverts AllowanceNotActive(from).
    function test_spend_from_revoked_refuses() public {
        _arrive(Allowance.State.Revoked);
        vm.expectRevert(abi.encodeWithSelector(Allowance.AllowanceNotActive.selector, Allowance.State.Revoked));
        vault.spend(_spend(1), _sign(olgaKey, _spend(1)));
    }

    // Who signs: every write, signed by any wallet but the declared one, reverts.
    function test_spend_signed_by_stranger_refuses() public {
        vm.expectRevert(abi.encodeWithSelector(Allowance.NotSignedBy.selector, olga));
        vault.spend(_spend(1), _sign(strangerKey, _spend(1)));
    }

    // Idempotent: the same signed request twice lands once.
    function test_spend_replayed_refuses() public {
        bytes memory sig = _sign(olgaKey, _spend(1));
        vault.spend(_spend(1), sig);
        vm.expectRevert(abi.encodeWithSelector(Allowance.AlreadyUsed.selector, 1));
        vault.spend(_spend(1), sig);
    }
    // ... one per move and state, per write and signer, per write replayed
}` },

"acme/generated/contracts/abi.ts": { k: "generated", n: "From forge build, not from the blueprint: the compiled contract owns its ABI. One typed module, imported by the server.", c:
`// Generated from forge build. Do not edit.
export const AllowanceVault = {
  abi: [/* 3 writes, 4 reads, 3 events, 7 errors */] as const, «-5»
  abi: [/* 4 writes, 5 reads, 5 events, 9 errors */] as const, «5»
  bytecodeHash: "0x9f2c…41ab",
} as const` },

"acme/generated/api/src/contracts/allowance-vault.ts": { k: "generated", n: "The contract's Effect client, from the ABI and the blueprint together: each write a span, each custom error decoded into its typed error, each payload sent with its signature by the relayer.", c:
`// Generated from the blueprint and forge build. Do not edit.
import { Effect } from "effect"
import { Chain } from "@architect/std/chain"
import { AllowanceVault } from "../../../contracts/abi"
import { AllowanceExceeded, VaultBalanceLow } from "@acme/blueprint/things/allowance/errors"
import { AllowanceNotActive } from "../allowance/machine"

export class VaultClient extends Effect.Service<VaultClient>()("acme/VaultClient", {
  effect: Effect.gen(function* () {
    const chain = yield* Chain                  // the standard library's wrapped viem, and the relayer
    const decode = chain.decodeErrors(AllowanceVault.abi, { AllowanceExceeded, VaultBalanceLow, AllowanceNotActive })
    return {
      spend: Effect.fn("vault.spend")((s: Spend, signature: Signature) =>
        chain.relay(AllowanceVault, "spend", [s, signature.bytes]).pipe(decode,
          Effect.tap((sent) => Effect.annotateCurrentSpan({ tx: sent.hash, signer: signature.signer })))),
      // grant, revoke: the same shape
    }
  }),
}) {}` },

"acme/generated/api/src/allowance/spend.handler.ts": { k: "generated", n: "What the spend handler is given: its payload, its steps as span wrappers, and from layer four the vault's client and a signature already checked. The error type is exactly the declared union.", c:
`// Generated from the blueprint. Do not edit.
import type { Effect } from "effect"
import type { Payload, Answer } from "./spend"
import type { AllowanceExceeded, AllowanceNotFound } from "@acme/blueprint/things/allowance/errors" «-4»
import type { AllowanceExceeded, AllowanceNotFound, VaultBalanceLow } from "@acme/blueprint/things/allowance/errors" «4»
import type { AllowanceNotActive } from "./machine"
import type { ChainUnavailable, ChainRejected } from "@architect/std/chain" «4»
import type { Step, Principal, Move, Signature } from "@architect/blueprint/server" «4»
import type { Step, Principal, Move } from "@architect/blueprint/server" «-4»
import type { VaultClient } from "../contracts/allowance-vault" «4»

export interface Context {
  readonly principal: Principal                // already checked: the allowance's grantee
  readonly steps: {
    load: Step<"allowance.spend.load", "database">
    record: Step<"allowance.spend.record", "database"> «-4»
    submit: Step<"allowance.spend.submit", "chain"> «4»
    confirm: Step<"allowance.spend.confirm", "wait"> «4»
  }
  readonly move: Move<"spend", "active" | "exhausted"> «-4»
  readonly vault: VaultClient                  // reverts decoded into typed errors «4»
  readonly signature: Signature<"Spend">       // the grantee's, over this payload, already checked «4»
}

export type Errors = AllowanceExceeded | AllowanceNotFound | AllowanceNotActive «-4»
export type Errors = AllowanceExceeded | AllowanceNotFound | VaultBalanceLow | AllowanceNotActive | ChainUnavailable | ChainRejected «4»
export type Handler = (payload: Payload, context: Context) => Effect.Effect<Answer, Errors>` },

"acme/generated/sdk/src/allowance/spend.ts": { k: "generated", n: "The SDK call. From layer four it takes a signer: it fetches what to sign, signs it with whatever wallet the caller passes, and sends both.", c:
`// Generated from the blueprint. Do not edit.
export const spend = (input: { allowance: AllowanceId; amount: bigint; memo: string }, options?: { requestKey?: string }) => «-4»
  client.call("allowance.spend", input, options)   // Effect<{ remaining }, AllowanceExceeded | AllowanceNotFound | AllowanceNotActive | NotAllowed> «-4»
export const spend = (input: { allowance: AllowanceId; to: Address; amount: bigint }, options: { signer: Signer; requestKey?: string }) => «4»
  client.signed("allowance.spend", input, options) // prepare → sign the typed data → send; Effect<{ remaining, tx }, ...> «4»` },

"acme/generated/cli/src/allowance/spend.ts": { k: "generated", n: "", c:
`// Generated from the blueprint. Do not edit.
// acme allowance spend <allowance> --amount <amount> --memo <memo> «-4»
// acme allowance spend <allowance> --to <address> --amount <amount> [--wallet <name>] «4»
export default Command.make("spend", { allowance: Args.text(), amount: Options.integer("amount"), memo: Options.text("memo") }, «-4»
export default Command.make("spend", { allowance: Args.text(), to: Options.text("to"), amount: Options.integer("amount"), wallet: Wallet.option }, «4»
  (input) => Sdk.allowance.spend(input).pipe(Output.answer, Output.exitOn(Sdk.errors)))   // exit code = the error's exit «-4»
  (input) => Sdk.allowance.spend(input, { signer: Wallet.signer(input.wallet) }).pipe(Output.answer, Output.exitOn(Sdk.errors)))   // signs with your local key «4»` },

"acme/generated/cli/src/wallet.ts": { k: "generated", n: "The wallet commands every CLI gets once the wallets kit is in use: the local key lives in your keystore, never on the server.", c:
`// Generated from the blueprint. Do not edit.
// acme wallet create <name>     a new key, encrypted in ~/.acme/keys
// acme wallet import <name>     an existing key, or a hardware wallet
// acme wallet link <name>       sign in with Ethereum: prove the address is yours, attach it to your account
// acme wallet list
export default Command.make("wallet").pipe(Command.withSubcommands([Wallet.create, Wallet.import, Wallet.link, Wallet.list]))` },

"acme/generated/docs/allowance/spend.md": { k: "generated", n: "", c:
`<!-- Generated from the blueprint. Do not edit. -->
# allowance.spend

Spend from what is left of this month's allowance.

Who may call: the allowance's grantee. «-4»
Who may call: the allowance's grantee, signing with their own wallet. «4»
Moves: active to active, or active to exhausted.  Emits: AllowanceSpent.
Refuses: AllowanceExceeded (41), AllowanceNotFound (43), AllowanceNotActive (40), NotAllowed (3). «-4»
Refuses: AllowanceExceeded (41), VaultBalanceLow (42), AllowanceNotFound (43), AllowanceNotActive (40), NotAllowed (3). «4»
Budget: p95 150 milliseconds. «-4»
Budget: p95 4 seconds, the wait for the chain excluded. «4»

    acme allowance spend alw_7f3 --amount 120 --memo train «-4»
    acme allowance spend alw_7f3 --to 0x5a…c1 --amount 120 «4»` },

"acme/generated/mcp/src/server.ts": { k: "generated", n: "The MCP server: one tool per operation and read, built on the SDK, deployed as a remote server you connect to with OAuth.", c:
`// Generated from the blueprint. Do not edit.
import { McpServer } from "@architect/blueprint/mcp"
import * as Sdk from "@acme/sdk/effect"

export default McpServer.make({
  name: "acme",
  auth: "oauth",                               // Better Auth's OAuth provider: each agent signs in as a person
  tools: [Sdk.allowance.grant, Sdk.allowance.spend, Sdk.allowance.revoke, Sdk.allowance.get, Sdk.allowance.list /* ... */],
  signing: "ask",                              // a tool that needs a signature asks the person's wallet to sign «4»
})` },

"acme/generated/sdk/package.json": { k: "generated", n: "The SDK as a published package. Its version comes from the model: what changed decides major, minor or patch.", c:
`{
  "name": "@acme/sdk",
  "version": "1.1.0", «-4»
  "version": "2.0.0", «4»
  "description": "Generated from the blueprint. Do not edit.",
  "type": "module",
  "exports": { ".": "./dist/index.js", "./effect": "./dist/effect.js" },
  "peerDependencies": { "effect": "^3.10.0" },
  "publishConfig": { "access": "public" }
}` },

"acme/generated/cli/homebrew/acme.rb": { k: "generated", n: "One of the CLI's destinations: a Homebrew formula, published to the project's tap with each version.", c:
`# Generated from the blueprint. Do not edit.
class Acme < Formula
  desc "acme: the command line for acme, generated from its blueprint"
  homepage "https://acme.dev"
  version "1.1.0"
  url "https://github.com/acme/acme/releases/download/v1.1.0/acme-darwin-arm64.tar.gz"
  sha256 "4b1f…e09c"
  def install
    bin.install "acme"
  end
end` },

"acme/generated/infra/src/production.ts": { k: "generated", n: "The Alchemy stack for production, from blueprint/environments/production.ts: every deployed output, where it runs.", c:
`// Generated from the blueprint. Do not edit.
import alchemy from "alchemy"
import { Worker, D1Database, DurableObjectNamespace } from "alchemy/cloudflare"
import { Chain } from "@architect/blueprint/infra" «4»

const app = await alchemy("acme-production")
const db = await D1Database("acme")                                              // things that live in the database
const vaults = await Chain.factory("AllowanceVault", { network: "base", verify: true })   // one vault per organisation «4»
const timers = await DurableObjectNamespace("timers", { className: "Timers", sqlite: true })   // the keeper's alarms, one per thing «5»
await Worker("server", { entry: "../server/main.ts", domain: "api.acme.dev", bindings: { db } }) «-4»
await Worker("server", { entry: "../server/main.ts", domain: "api.acme.dev", bindings: { db, vaults } }) «4-5»
await Worker("server", { entry: "../server/main.ts", domain: "api.acme.dev", bindings: { db, vaults, timers } }) «5»
await Worker("mcp", { entry: "../mcp/src/server.ts", domain: "mcp.acme.dev" })
await Worker("portal", { assets: "../portal/dist", domain: "acme.dev" })
await app.finalize()` },

"acme/generated/keeper/src/allowance.expire.ts": { k: "generated", n: "The keeper for a time move it fires. Nothing scans: a grant sets the allowance's own timer through the world's Timers service, a Durable Object alarm in a real world and a row in the world's timer table in a stepped one.", c:
`// Generated from the blueprint. Do not edit.
import { Blueprint } from "@architect/blueprint"
import { Keeper } from "@architect/blueprint/keeper"

// allowance.expire: 1 year after grant, fired by the keeper, at most 10 minutes late.
export default Keeper.move("allowance.expire", {
  timer: { after: "grant", wait: "1 year" },   // set when the grant lands; the world's Timers fires it when due
  as: "keeper",                                // the built-in caller: traced, refused and evaluated like any other
  key: Blueprint.secret("KEEPER_KEY"),         // its wallet may make time moves, and nothing else
  late: "10 minutes",                          // the on-time eval fails it past this
})` },
};

const LAYER_RE = /\s*«(\d)?(?:-(\d))?»\s*$/;
function at(p, n, diff) {
  const out = [];
  for (const line of LAYERED[p].c.split("\n")) {
    const m = line.match(LAYER_RE);
    const text = line.replace(LAYER_RE, "");
    const from = m && m[1] ? +m[1] : 0, until = m && m[2] ? +m[2] : 99;
    if (n < from) continue;
    if (n >= until) { if (diff && n === until) out.push("- " + text); continue; }
    out.push(diff && n === from ? "+ " + text : text);
  }
  return out.join("\n");
}
