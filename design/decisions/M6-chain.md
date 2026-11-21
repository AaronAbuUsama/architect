# M6-chain: the chain decision (M6.01)

Decided 21 November 2026 by the Goal 4 lead, as slice 1b of `design/goals/04-on-chain.md`, grounded at
`goal/on-chain` with `goal/stage-1` at `37778735` merged in. K7 and K25 settle most of M6.01. What they left, and this
record settles:

1. `signedBy` as EIP-712 typed data (D5's item 2);
2. values across languages, the rest of D5 (item 1), including what money is for `examples/budgets`;
3. the exact schema of `generated/solidity/surface.json`;
4. the exact schema of `blueprint/refusals.lock`.

Building the budgets example also needs answers K7 and K25 did not give: which roles an operation on chain may name,
who mints a new row's id, what an operation's answer is when the call lands later, and what a read of a chain-stored
thing may require. Those are settled here too (items 5 to 9), because the journey author (slice 2) writes against them.

This is the building agent's call under `AGENTS.md` ("Who decides"). Aaron can overrule any item.

## The problem, in code

Codes still come from declaration order, so reordering two errors swaps their codes on every language:

```ts
// packages/compiler/src/modules/model/internal/describe.ts:107
const errors = Object.fromEntries(inDeclarationOrder(t.errors).map(([n, e], i) => [n, { /* … */ code: codeOf(prefix.get(name) ?? "??", i + 1) }]));
```

The chain adapter already decodes refusals from a lock that nothing writes yet:

```ts
// packages/chain-evm/src/modules/faults/types.ts:27-35
/** The EVM projection of one wire identity in blueprint/refusals.lock, including old selectors. */
export interface RefusalLockEntry {
  readonly code: string; readonly name: string; readonly selector: Hex; readonly signature: string;
  readonly abi: Extract<Abi[number], { type: "error" }>; readonly program?: Address;
}
```

D5 drafted `signedBy: role` (`design/build-plan.md:204`), but nothing in `packages/` signs typed data: `git grep
signTypedData -- packages` finds nothing. The only working EIP-712 path is the spike's
(`spikes/chain-languages/evm/src/Governance.sol:66-80` on `main`): `voteBySig` with a nonce and a deadline, recovered by
`ECDSA.tryRecover`. It found that a tampered signature reads as `NotAllowed` (`evm#12`), that a replay reads as
`InvalidNonce` and hides the real refusal (`evm#12`), and that a second relayer's mined revert still leaves the vote on
chain (`evm#14`).

A value carries only what TypeScript needs:

```ts
// packages/orthograph/src/modules/values/types.ts:21-25
export type ValueMeta =
  | { readonly type: "id"; readonly prefix: string } | { readonly type: "uint"; readonly bits: number }
  | { readonly type: "text"; readonly max: number } | { readonly type: "schema"; readonly format?: "ref-any" };
```

And a role is a TypeScript function today (`packages/orthograph/src/modules/roles/types.ts:15-20`), which no contract
can run: K20's declared `who` and `holds` (M2.17, M2.18) are not built yet.

## Decided

### 1. Signing: no `signedBy` to write; every chain operation has a direct entry and a signed one

D5 had the author write `signedBy: role`. That says twice what `allowed:` already says: on chain the caller is the
account that signed, and the role decides whether that account may act. So, as with `runs` (K25 item 6), an author
writes neither. For each operation on a thing in a chain store, the Solidity language generates two entries:

```solidity
// generated/solidity/BudgetsBase.sol (shape)
function spend(bytes32 allowance, uint128 amount, address to) external {                   // direct: the caller is msg.sender
    _spend_(msg.sender, allowance, amount, to);
}
function spendBySig(bytes32 allowance, uint128 amount, address to,
                    address signer, uint256 nonce, uint256 deadline, bytes calldata signature) external {   // signed: anyone submits
    if (block.timestamp > deadline) revert SignatureExpired(deadline);                       // AR-003
    bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(ALLOWANCE_SPEND_TYPEHASH, allowance, amount, to, signer, nonce, deadline)));
    if (!SignatureChecker.isValidSignatureNow(signer, digest, signature)) revert BadSignature(); // AR-005
    _spend_(signer, allowance, amount, to);   // the nonce is checked and taken inside, on both paths
}
```

- **The typed data.** The domain is `{ name: <the store's contract name>, version: "1", chainId, verifyingContract }`,
  from OpenZeppelin's `EIP712` (5.x), readable through `eip712Domain()` (ERC-5267). The type hash already changes
  whenever a payload changes, so the version stays `"1"`. The primary type is the operation's name in Pascal case
  (`allowance.spend` → `AllowanceSpend`). Its members are the payload's fields in declaration order, each with its
  Solidity type (item 2), then `address signer`, `uint256 nonce`, `uint256 deadline`.
- **The signer is named, not recovered.** `SignatureChecker` checks an account's own ECDSA signature or asks a contract
  account through ERC-1271. So a Safe can sign through its owners, and a tampered signature is `BadSignature`, not a
  random address refused `NotAllowed` (`evm#12`).
- **Nonces are per account, in order, on both paths.** `nonces(address)` is a generated read. Every call takes the
  acting account's next nonce, a direct call included, so the follower matches a call to its intent the same way on
  both paths (item 4), and a direct call cancels a signed one not yet sent. A signed call whose nonce is not the next
  one is `InvalidNonce { expected, got }` (AR-004). Unordered nonces (a bitmap, as Permit2 does) wait until someone
  needs several signed calls in flight from one account.
- **The deadline is a block time.** The client reads the latest block's timestamp and adds the environment's window
  (`deadline: "10 minutes"` by default); it never reads the wall clock (`AGENTS.md`). Time on chain is M6.21's, and
  this needs none of it.
- **The order of checks**, the same on every entry and in the TypeScript reference: the deadline, the signature, the
  nonce, then whether the row exists (item 6), then the role, the machine, the developer's body, the payment through
  the account adapter, and the event. Everything after the nonce is the order K7 Q5 fixed.
- **Who sends.** Part 1 (slices 7 and 8): the client sends the direct entry itself through `chain-evm`, after
  simulating. Part 2 (slices 9 and 11): it signs and the relayer sends the signed entry. A wrong signer is refused by
  the simulation before anything is sent, on both paths (M1.32).

### 2. Values across languages (the rest of D5)

K25 item 5 gave each value its Solidity type. Across the three places a value travels:

| Value | Effect and the SDK | JSON on the wire | Solidity, the ABI and EIP-712 |
|---|---|---|---|
| `uint(bits)` | `bigint` | a decimal string | `uint<bits>` |
| `id(prefix)` | branded text, `alw_7f3k…` | the text | `bytes32`: the text's UTF-8 bytes, right-padded with zeros; trailing zeros are stripped on the way back |
| `text({ max })` | `string` | the text | `string` |
| `account()` | CAIP-10 text, `eip155:31337:0x…`, checksummed | the text | `address`; the client refuses an account whose chain part is not the store's chain, before signing |
| a machine's state | its name | its name | `uint8`, `0` for a row that doesn't exist, then the declared states in order from `1` |

- **Limits are checked before sending.** `max` on text and the range of `uint` are checked by the client and by
  Effect's payload decoding, as for any operation; the ABI decoder refuses an out-of-range `uint`; the contract does not
  count characters, which UTF-8 makes differ from Effect's count.
- **States are numbered by declaration order.** Reordering or removing a state of a chain-stored thing changes what its
  rows mean, so `ortho check` reports it as major; adding one at the end is minor.
- **Money, for this goal.** THI-07 (a value for money: decimals, currency, negatives) stays open and stays Aaron's
  round. Goal 4 does not need it to prove the chain: an allowance names its token as an account, and its amounts are
  `uint(128)` in the token's base units, with no decimals in the value. The Safe pays with the token's
  `transfer(to, amount)` through the account adapter. When THI-07 is designed, its amount wraps this.

### 3. `generated/solidity/surface.json`

Written by `ortho generate` from the model alone, so generating needs no compiler. It lists every external entry the
generated base declares; the clients (SDK, CLI) are generated from it and never from the compiled ABI.

```jsonc
{
  "generated": "Generated from blueprint/stores/budgets.ts. Do not edit.",
  "schemaVersion": 1,
  "language": "solidity",
  "store": "budgets",                   // the store file's name; the contract's name is its Pascal form
  "contract": "Budgets",
  "kind": "chain.evm",
  "domain": { "name": "Budgets", "version": "1" },   // chainId and verifyingContract come from the environment's deployment
  "states": { "allowance": ["absent", "active", "exhausted", "revoked"] },   // index = the uint8 on chain (item 2)
  "entries": [
    {
      "entry": "spend",
      "signature": "spend(bytes32,uint128,address)",
      "selector": "0x…",                // the first 4 bytes of keccak256(signature)
      "kind": "operation",              // operation | read | generated
      "operation": "allowance.spend",
      "path": "direct",                 // direct | signed (operations only)
      "mutability": "nonpayable",
      "inputs": [{ "name": "allowance", "type": "bytes32", "value": "id" }, { "name": "amount", "type": "uint128", "value": "uint" }, { "name": "to", "type": "address", "value": "account" }],
      "outputs": [],
      "role": "grantee",                // the role's export name; null for anyone
      "refusals": ["AR-004", "AL-901", "AR-001", "AL-900", "AL-001"],   // codes, in the order the entry checks them
      "events": ["AllowanceSpent"]
    },
    {
      "entry": "spendBySig",
      "signature": "spendBySig(bytes32,uint128,address,address,uint256,uint256,bytes)",
      "selector": "0x…",
      "kind": "operation", "operation": "allowance.spend", "path": "signed", "mutability": "nonpayable",
      "inputs": [/* the payload's, then signer, nonce, deadline, signature */],
      "outputs": [],
      "typedData": { "primaryType": "AllowanceSpend", "types": { "AllowanceSpend": [
        { "name": "allowance", "type": "bytes32" }, { "name": "amount", "type": "uint128" }, { "name": "to", "type": "address" },
        { "name": "signer", "type": "address" }, { "name": "nonce", "type": "uint256" }, { "name": "deadline", "type": "uint256" } ] } },
      "role": "grantee",
      "refusals": ["AR-003", "AR-005", "AR-004", "AL-901", "AR-001", "AL-900", "AL-001"],
      "events": ["AllowanceSpent"]
    },
    { "entry": "get", "signature": "get(bytes32)", "selector": "0x…", "kind": "read", "operation": "allowance.get", "mutability": "view", "inputs": [/* … */], "outputs": [/* the read's fields, then state */], "role": null, "refusals": ["AL-901"], "events": [] },
    { "entry": "nonces", "signature": "nonces(address)", "selector": "0x…", "kind": "generated", "mutability": "view" },
    { "entry": "hasRole", "signature": "hasRole(bytes32,address)", "selector": "0x…", "kind": "generated", "mutability": "view" },
    { "entry": "eip712Domain", "signature": "eip712Domain()", "selector": "0x…", "kind": "generated", "mutability": "view" }
  ],
  "events": [
    { "name": "AllowanceSpent", "event": "allowance.AllowanceSpent", "signature": "AllowanceSpent(bytes32,address,uint256,uint128,address,uint128)", "topic": "0x…",
      "fields": [{ "name": "allowance", "type": "bytes32", "indexed": true }, { "name": "by", "type": "address", "indexed": true }, { "name": "nonce", "type": "uint256", "indexed": false } /* , then the event's own fields */] }
  ]
}
```

- **Entries are sorted** by operation name, then path, then reads and generated entries by name, so the file is stable.
- **Every event on chain carries `by` and `nonce`** before its declared fields: the acting account and the nonce its
  call took. The intent K7 Q3 matches for `confirmed` is `(contract, by, nonce)`.
- **Hand-written external functions** in `src/Budgets.sol` are not in this file. K7 F1 lets them be reached; M6.11 adds
  how, by classifying the compiled ABI in `ortho check` into a separate `generated/solidity/helpers.json`, so this file
  keeps one writer. The budgets example writes none.

### 4. `blueprint/refusals.lock`

Written by `ortho generate`, checked in, and append-only: generate reads the lock it finds and only adds to it. It
lives in `blueprint/`, beside what the author writes, because, like a migration, what it holds outlives any one
generate. It holds every refusal of the project, whatever language raises it, Effect included (K7 item 6).

```jsonc
{
  "generated": "Generated from blueprint/. Append-only. Do not edit.",
  "lockVersion": 1,
  "refusals": {
    "AL-001": {
      "name": "AllowanceExceeded",
      "owner": "allowance",             // a thing's name, or "runtime" for AR- codes
      "from": "blueprint/things/allowance/errors.ts",   // absent for generated refusals (machine, not found, runtime)
      "fields": { "remaining": { "value": "uint", "bits": 128 } },
      "wire": {
        "effect": { "tag": "AllowanceExceeded" },
        "solidity": { "signature": "AllowanceExceeded(uint128)", "selector": "0x…" }   // only once a chain store raises it
      },
      "earlier": []                      // wire identities this code had before, kept so old contracts still decode
    },
    "AR-001": { "name": "NotAllowed", "owner": "runtime", "fields": {}, "wire": { "effect": { "tag": "NotAllowed" }, "solidity": { "signature": "NotAllowed()", "selector": "0x…" } }, "earlier": [] }
  },
  "retired": { }                         // code → the entry as it was when its name left the blueprint
}
```

- **The first lock keeps today's codes.** The first generate after this lands numbers every existing refusal exactly as
  `describe.ts` does now, so acme's and Plugged In's codes and generated files do not change.
- **After that, a name keeps its code.** Reordering declarations changes nothing. A new error takes its thing's next
  unused number, never one used before (900 and 901 stay the machine's and not-found's).
- **A changed shape keeps the code.** Adding or retyping a field gives the code a new wire identity; the old one moves to
  `earlier`, so a client still decodes an older contract (`evm#19`). `chain-evm`'s `RefusalLockEntry` is one EVM wire
  identity, current or earlier, read from this file.
- **A rename is a new code.** An error whose name leaves the blueprint moves to `retired`, and its code is never given
  again; a renamed error takes a new code, and `ortho check` reports the change as major. This replaces K7 Q5's "a
  rename of a published code is refused": the lock can't tell a rename from a removal and an addition, and refusing
  either would stop a developer renaming an error before anything is published.
- **The runtime's codes are fixed by the lock too.** `AR-001` `NotAllowed` and `AR-002` `IdempotencyConflict` as today;
  the chain adds `AR-003` `SignatureExpired { deadline }`, `AR-004` `InvalidNonce { expected, got }`, `AR-005`
  `BadSignature`, and `AR-006` `AlreadyExists { id }` (item 6). Effect never raises the four new ones.
- **The lock's own reader** is the compiler. The model's `refusals` map is read from it, so every generator keeps
  reading codes from the model, as `codes.ts` says today.

### 5. Roles on chain

K20's rule 6 and K25 item 4 hold: a declared role renders in every language, a `rule` role is TypeScript only.

- An operation on a chain-stored thing may name only a `who` role whose field is an `account()`, or `.of(path)` to
  one, or a `holds` role whose holding thing lives in the same chain store, or `Blueprint.anyone`. The compiler refuses
  a `rule` role there, naming the operation and the role.
- A `who` role on an account field compares the field with the acting account (item 1).
- **On a creating move** (from no state), a `who` role on the operation's own thing is decided on the payload's field
  of the same name: the row about to be made. This is how a Safe grants an allowance that names it.
- `Blueprint.signedIn` is refused on chain: every caller on chain has signed.
- K20's `who` form is built by whichever comes first: Goal 3's M2.18 on `goal/stage-1`, or Goal 4's slice 3, which then
  builds only `who`, in K20's spelling, and tells the Goal 3 lead before it starts. `holds` stays M2.18's.

### 6. A new row's id, and a row that isn't there

- **The client mints the id** of a creating move, in the thing's prefix, before it signs, as the Effect runtime mints it
  before the handler runs. The contract stores the row under it. A create on an id that already holds a row is
  `AlreadyExists { id }` (AR-006): only a replayed or hostile call meets it, since minted ids don't collide.
- **A row that doesn't exist** is refused exactly as the model's `notFound` says for Effect (`found.ts:1-3`):
  `NotAllowed` when every way in is a role that reads it, `<Thing>NotFound` otherwise. Never the machine's refusal with
  state `absent`, which the spike used and which would make the fuzz diverge from Effect.

### 7. An operation's answer is read from its event

A call on chain lands later, so it has no answer of its own. Every field of a chain operation's `answer` must be a
field of its move's event, or the new row's id; the compiler refuses one that isn't. The SDK answers them when the call
is `confirmed`, from the event it matched. `allowance.spend`'s `remaining` is already a field of `AllowanceSpent`.

### 8. What a chain operation doesn't declare

The compiler refuses these on an operation of a chain-stored thing, naming each, rather than ignore them:
- `steps`: the contract reaches only its own store and the account adapter, which the generated base calls;
- `idempotent`: the nonce makes every call land at most once;
- `runs` (K25 item 6) and `signedBy` (item 1): both are worked out.

A `budget`, which observability reads, stays allowed, and is judged on the time to `included`.

### 9. Reads of a chain-stored thing are public

A public chain shows every row (K25 item 5's reason), so a declared read of a chain-stored thing is a generated `view`
entry, called with `eth_call` at the environment's confirmation level, and its `allowed` must be `[Blueprint.anyone]`.
The compiler refuses a role there. Reads move to the follower's view in slice 10.

## The budgets example, as the journey author will write it

A sketch for slice 2, not its words: the journey author owns `examples/budgets/blueprint/`.

```ts
// blueprint/stores/budgets.ts
export default Blueprint.store.chain.evm();

// blueprint/values/money.ts
export const Amount = Blueprint.value(Blueprint.uint(128));      // in the token's base units (item 2)

// blueprint/things/allowance/thing.ts
export const Allowance = Blueprint.thing({
  description: "Money a member may spend from a Safe, up to a limit.",
  fields: { id: Blueprint.id("alw"), safe: Blueprint.account(), member: Blueprint.account(),
            token: Blueprint.account(), limit: Amount, spent: Amount },
  lives: budgets,
});

// blueprint/things/allowance/roles.ts
export const treasury = Blueprint.role(Allowance, { who: Allowance.fields.safe });    // the Safe itself, by its owners
export const grantee = Blueprint.role(Allowance, { who: Allowance.fields.member });

// verbs: grant (allowed: [treasury], decided on the payload's safe, item 5), spend (allowed: [grantee], payload
// { allowance, amount, to }), revoke (allowed: [treasury]), get (allowed: [Blueprint.anyone], item 9)
```

The Safe and its test token come from the `safe` adapter's starting world (slice 7): a Safe owned by the cast's `ada`,
with the budgets module enabled and a test token minted to it. The budgets example's `funded` world starts from it.
Before slice 7, the generated Foundry tests and the fuzz treat the Safe as any account. A `Safe` thing behind the
adapter, as K25 item 7 sketched, joins when the adapter offers the Safe's reads; the allowance's `safe` stays a plain
account until then.

## Left open, with where it is decided

- **The fuzz's oracle for the developer's body.** The reference machine is generated from the blueprint, but the
  body (`_spend`'s limit check) is written only in Solidity. How the fuzz judges what the body decides (the blueprint's
  declared outcomes only, or a TypeScript body beside it) is slice 6's decision step, with its checks author.
- **Money** (THI-07): Aaron's round, unchanged.
- **Unordered nonces, ERC-7579 accounts, Solana and Aztec signing:** later, as above and in K7.

## Not chosen, and why

- **`signedBy: role` written on the operation** (D5): it repeats `allowed:`, and two declarations that must agree will
  one day disagree.
- **A signed entry only, no direct one:** a Safe or a person with gas could not call the module themselves, and the
  slices before the relayer could not send at all.
- **Recovering the signer from the signature** (the spike's `ECDSA.tryRecover`): contract accounts can't sign that way,
  and a bad signature reads as `NotAllowed` (`evm#12`).
- **Refusing a rename in the lock** (K7 Q5): see item 4.
- **surface.json written after compiling:** `ortho generate` would need Foundry, and the file would have two writers.

## What it touches

| Dependent | Why it cares |
|---|---|
| Slice 2, the journey author | writes the budgets blueprint and journeys against items 1 and 5 to 9 |
| Slice 3 (M6.10): `orthograph`, `compiler` | `Blueprint.account()`, chain stores, item 2's types, the lock (item 4), the refusals of items 5 to 9 |
| Slice 4 (M6.11): `language-solidity` | the two entries, the typed data, the events' `by` and `nonce`, `surface.json` (item 3) |
| Slices 8, 11 (M6.14, M6.15): the client | reads `surface.json`; mints ids; reads the deadline from a block; answers from the event |
| `chain-evm` | `RefusalLockEntry` is read from the lock's EVM wire identities |
| Slice 10 (M6.09): the follower | matches `(contract, by, nonce)` |
| Goal 3's M2.18 | builds `who` and `holds`; item 5 tells it who builds `who` first |
| acme and Plugged In | unchanged: the first lock keeps today's codes |

## Supersedes

- design/build-plan.md (D5): "(2) `signedBy: role`, where the signed payload is the operation's payload as EIP-712 typed data with a nonce and deadline, checked by OpenZeppelin's SignatureChecker." → "(2) No `signedBy`: every chain operation has a direct entry and a signed one, whose EIP-712 typed data is the payload with the signer, a nonce and a deadline, checked by OpenZeppelin's SignatureChecker (M6-chain item 1)."
- design/milestones.md (M6.10): "renaming a published code is refused" → "renaming a locked error gives it a new code and retires the old one, and `ortho check` reports it as major (M6-chain item 4)"
- design/decisions/K7-chain-languages.md (Q5, decided item 1): "A rename of a published code is refused." → "A renamed error takes a new code and the old one is retired (M6-chain item 4)."
