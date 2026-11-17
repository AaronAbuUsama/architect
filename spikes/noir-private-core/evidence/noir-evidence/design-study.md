# A private allowance on Aztec, from first principles

Designs for Architect's Noir target. Written 16 November 2026.

**How this was researched.** I read the source at the tag the spike runs on: a sparse checkout of
`AztecProtocol/aztec-packages` at `v5.3.0` (commit `ddb0adb`, 26 October 2026): the library
(`noir-projects/aztec-nr`), the example contracts (`noir-projects/noir-contracts/contracts`), the protocol circuits
(`noir-projects/noir-protocol-circuits`), the PXE and TXE (`yarn-project/pxe`, `yarn-project/txe`) and the developer
docs shipped in the same tag (`docs/docs-developers/docs`). I cross-checked against `v6.0.0` (20 October 2026), which
is what docs.aztec.network serves today. Every claim below names its file. Paths are relative to
`https://github.com/AztecProtocol/aztec-packages/blob/v5.3.0/` unless marked otherwise.

**What this is not.** I compiled and ran nothing. The Noir fragments are sketches against v5.3.0 names, not tested
code. Where the source left a question open I say so, and section 8 lists what a spike must settle.

---

## 0. The short version

1. **A private function knows one thing about the moment its transaction lands: that a nullifier it emits was never
   emitted before.** Everything else it knows is true as of an earlier block, the anchor, which may be up to 24 hours
   old. This one fact decides how revoke can work.
2. **So a private revoke is immediate only if the owner can emit the very nullifier the member's next spend must
   emit.** That needs state both parties can destroy. The spike's note cannot be destroyed by the owner because the
   default nullifier is built from the note owner's secret key. That is the "Key validation request denied" error.
3. **The other private revoke is a tombstone:** the owner emits a nullifier, and each spend proves it was absent as of
   the anchor. It needs no public state and leaves no public trace, but it takes effect within a window: 24 hours for
   free, less at a privacy cost. `DelayedPublicMutable` is the stock, public version of the same idea.
4. **Time needs no public call.** "This moment has passed" is proven privately and for free from the anchor block's
   timestamp. "This moment has not passed" is enforced by the transaction's expiration timestamp, which is public but
   stays at its default unless the deadline is less than 24 hours away.
5. **Money is the second hard part, and the brief did not name it.** Spending private tokens needs the nullifier key of
   whoever owns the token notes. An authwit does not delegate that. So "one vault per organisation" on Aztec means
   every member holds the vault's keys and can read the vault's notes. The alternative is a funded pocket per
   allowance.
6. **Recommendation: a pocket per allowance (design C).** The allowance is a small private contract instance with its
   own keys, held by the owner and the member, funded by the owner, never published on chain. Each month is its own
   storage slot, so reset is not an operation and cannot be wrong. Revoke destroys the slots and takes the money back.
   The public sees only what every private transaction shows: who paid the fee, and, in the last day of a month, a
   shorter transaction lifetime.

---

## 1. The goal, from first principles

### 1.1 Who is involved

| Party | What they are |
|---|---|
| Owner | Grants, watches, revokes. The money is the organisation's. |
| Member | Spends, alone, whenever they choose, within the rules. |
| Recipient | Is paid. Learns the amount they received, nothing else. |
| Other members | Have their own allowances. Must learn nothing about this one. |
| The public | Anyone reading the chain or the transaction pool. |
| Sequencers and node operators | See what the public sees, plus timing, network addresses, and every query a wallet sends to their node. |
| Architect's server | Collects telemetry, may sponsor fees. Holds no keys and no private values. |

### 1.2 Hard requirements

| # | Requirement | Why it is hard, not nice |
|---|---|---|
| H1 | **The limit holds.** The spends charged to one month never exceed the limit, whatever the member's device or wallet does, and however many transactions race. | It is the definition of the product. |
| H2 | **Only the member spends**, to recipients the member chooses, from money the organisation set aside. | Same. |
| H3 | **The owner can end it alone.** Revoke needs nothing from the member: not their key, not their cooperation, not data only they hold. | Otherwise a hostile or absent member is unrevocable. |
| H4 | **Revoke is bounded.** Once the revoke is on chain, what the member can still spend is bounded in amount (at most what was left this month) and in time (a stated window), and no later month ever opens. | An unbounded tail defeats revocation. See 1.5 for why "bounded", not "instant", is the hard part. |
| H5 | **Time is honest.** Nothing is spent before a month starts or after the year ends. Leftover does not carry forward. | Otherwise the limit is not monthly. |
| H6 | **Amounts are private.** The public, sequencers and Architect's server learn none of: limit, spent, a spend's amount, its recipient. Other members learn none of it either. | The reason for the target. |
| H7 | **The owner can see** limit, spent and each spend without the member's help. | The owner is accountable for the money. |
| H8 | **The member needs no one online and holds no fee token.** | It replaces a card, not a request form. |
| H9 | **No trusted server.** Architect's server never needs a private value or a key. Telemetry never contains one. | Stated in the brief. |
| H10 | **The owner gets unspent money back** after revoke or expiry. | It is the organisation's. |

### 1.3 Nice to have

- Revoke that stops the very next spend, with no race.
- Month boundaries exact to the second.
- The public cannot even tell that an allowance exists, or link two spends of one allowance.
- No money set aside in advance.
- A revoke the public can audit.
- Changing the limit mid-year; an auditor who can read but not act.

### 1.4 What may lag, and what may not

| May be eventually consistent | Must be decided at the moment the transaction lands |
|---|---|
| The owner's view of "spent" (it arrives when their wallet syncs). | The limit check and the payment, together, atomically. |
| Notifications and events. | Which of a racing spend and revoke wins: exactly one. |
| The displayed state (active, exhausted, expired). | That a spent or revoked allowance is not used twice. |
| The reset: nobody needs to see it happen. | |
| The month boundary, within a stated tolerance. | |

### 1.5 What revoke must really mean

An allowance already bounds the damage: a member can always spend what is left this month one second before the
owner revokes. So a revoke that takes N hours to bite costs the owner at most what is left this month, which was
already at risk. That is why H4 asks for a bound, not for immediacy.

Two cases make the bound matter:

- **A month boundary inside the window.** If revoke lands an hour before the reset and takes 24 hours to bite, the
  member also gets next month's full limit. A design must either make future months die at once, or state that its
  worst case is "what is left, plus one more month".
- **A stolen device.** The thief has not spent yet and the owner is racing them. Here immediacy saves real money. This
  is the case for "stops the very next spend" as a strong nice-to-have.

So the question "must revoke stop the very next spend, or within a bounded window?" has this answer: **bounded is
required; immediate is worth paying for; race-free costs privacy** (section 4.1 shows why).

### 1.6 What a month must mean

Private code cannot read the clock. It can know an interval that contains "now" (section 3). So the definition has to
be written in terms of that interval:

- At grant, thirteen boundaries are fixed: `B0` (the start), then `B1` to `B12`, each the same day and time one
  calendar month later, `B12` being the expiry. They are computed once, by the owner's client, where calendar
  arithmetic is easy, and committed. No calendar arithmetic runs in a circuit.
- **A spend is charged to month k if it lands at a time t with `Bk <= t < B(k+1)`.**
- The lower edge is proven privately and exactly. The upper edge is either enforced exactly at a small privacy cost,
  or tolerated up to 24 hours late (a spend proven just before midnight that lands just after counts for the old
  month). Both are honest; a design must say which it promises.
- Boundaries should be rounded when granted (to the hour or the day), so that many allowances share them. The official
  crowdfunding example carries the same note to itself: "Ensure deadline is quantized to improve privacy set"
  (`noir-projects/noir-contracts/contracts/app/crowdfunding_contract/src/main.nr`, line 32).

---

## 2. What Aztec gives us

### 2.1 Versions, and what was renamed

The spike is on 5.3.0. Two release lines are live: 5.3.0 (26 October 2026) and 6.0.0 (20 October 2026).

| Then | Now (5.x) | Source |
|---|---|---|
| `SharedMutable` | `DelayedPublicMutable` | `docs/docs-developers/docs/resources/migration_notes.md`, "SharedMutable -> DelayedPublicMutable" |
| `max_block_number` | `include_by_timestamp`, then `expiration_timestamp`; `set_expiration_timestamp()` | same file, "`max_block_number` -> `include_by_timestamp`" and "`include_by_timestamp` renamed to `expiration_timestamp`" |
| `Router` contract | `PublicChecks`; no longer a protocol contract in 5.0, a standard contract a wallet must register | same file, "Renamed Router contract", "`public_checks` demoted from protocol contract" |
| nullifier secret key (`nsk`) | nullifier hiding key (`nhk`) | same file, "Nullifier secret key renamed" |
| `MessageDelivery.ONCHAIN_CONSTRAINED` | `MessageDelivery::onchain_constrained()`; also `onchain_unconstrained()`, `offchain()` | same file, "`MessageDelivery` API syntax change" |
| `PrivateMutable` in a `Map` by owner | `Owned<PrivateMutable<..>>` with `.at(owner)`; the owner is no longer a field of the note (since 3.0) | migration notes, "Note owner is now enshrined"; `noir-projects/aztec-nr/aztec/src/state_vars/owned.nr` |
| `assert_note_was_not_nullified_by` | `assert_local_note_was_not_nullified_by`, own contract's notes only (5.0.1) | migration notes, "History note nullification helpers renamed" |
| `context.push_nullifier` | `context.push_nullifier_unsafe` (5.0) | migration notes, "`push_nullifier` renamed to `push_nullifier_unsafe`" |
| `set_sender_for_tags` oracle | removed; `MessageDelivery::onchain_constrained().with_sender(address)` (5.0) | migration notes, "`set_sender_for_tags` oracle removed" |
| A note struct declared inside the contract | must be `pub` (5.2) | migration notes, "Note types declared inside a contract must be `pub`" |
| Any account's keys reachable in a call | Only the caller's, unless `additionalScopes` names more (4.1) | migration notes, "Scope enforcement for private state access" |

Present in 5.3.0 and useful here: `SinglePrivateMutable` and `SinglePrivateImmutable` (already there in 4.1),
`SingleUseClaim` (all in `noir-projects/aztec-nr/aztec/src/state_vars/`), and two things that arrived with 5.0:
`immutables_hash` in every contract address (migration notes, "`ContractInstance` gains `immutablesHash`") and
handshakes for message tags.

In 6.0.0, three things move under our feet (source: `aztec-labs-eng/aztec-node` at tag `v6.0.0`,
`docs/docs-developers/docs/resources/migration_notes.md`):

- aztec-nr and the example contracts leave `aztec-packages` for `github.com/aztec-labs-eng/aztec-nr` and
  `aztec-labs-eng/aztec-node`; npm packages move from `@aztec` to `@aztec-labs`.
- **`DelayedPublicMutable` rejects delays under one hour** (`DELAYED_PUBLIC_MUTABLE_MINIMUM_DELAY`). In 5.3.0 the
  example `auth_contract` still uses 360 seconds.
- Every example contract gains a header saying it is a proof of concept, unaudited, not for production. Read them as
  patterns, which is how this document uses them.

One line of the old notes matters for the future: the team wrote that it is "working on a `DelayedPrivateMutable`
which will have similar properties, except writes will be scheduled from private instead" (migration notes, same
section as the rename). It is in neither 5.3.0 nor 6.0.0. It would be a private kill switch off the shelf.

### 2.2 Notes, nullifiers, and who can destroy a note

- A note's nullifier, by default, is `hash(note hash, owner's app-siloed nullifier hiding key)`. The `#[note]` macro
  generates exactly that: `context.request_nhk_app(owner_npk_m_hash)`
  (`noir-projects/aztec-nr/aztec/src/macros/notes.nr`, lines 84 to 93).
- The key is checked by the kernel against the master key in the PXE, and the PXE refuses to hand it out for an
  address that is not in scope: "Key validation request denied: no scoped account has a key with hash ..."
  (`yarn-project/pxe/src/contract_function_simulator/oracle/utility_execution_oracle.ts`, line 242). **This is the
  spike's failing revoke**: the owner's wallet does not hold the member's nullifier key, and must not.
- The library says it plainly: "Only the 'owner' of the given PrivateMutable state variable can mutate it, because
  every mutation requires nullifying the current note" (`.../state_vars/private_mutable.nr`, lines 61 to 63).
- Even *creating* a `PrivateMutable` for someone needs their key, because its initialisation nullifier is built from
  it (`private_mutable.nr`, `get_initialization_nullifier`, lines 106 to 110). An owner cannot initialise a member's
  `PrivateMutable`. A `PrivateSet` has no such limit: "Other people can insert notes into the set"
  (`.../state_vars/private_set.nr`, lines 75 to 77).
- **The escape hatch is `#[custom_note]`**: you write the nullifier yourself. The docs name the use: "Custom nullifier
  schemes (e.g., notes spendable by anyone with a secret, not tied to an owner)"
  (`docs/.../aztec-nr/framework-description/custom_notes.md`, line 118). The example is `TransparentNote`, whose
  nullifier uses no key at all and whose spending is guarded by the function's own logic
  (`noir-projects/noir-contracts/contracts/app/token_blacklist_contract/src/types/transparent_note.nr`). The helper is
  `compute_note_nullifier(note_hash_for_nullification, [anything])`
  (`noir-projects/aztec-nr/aztec/src/note/utils.nr`, lines 30 to 37).
- A nullifier with no secret in it can be recomputed by anyone from the public note hash, which links the note to its
  spend. A shared note therefore needs a random secret, carried in the note, inside the nullifier.
- **Non-existence in private is only ever as of the anchor.** "it is not possible to privately prove that a nullifier
  does not exist by the time a transaction is executed"; the two real options are "actually emitting the nullifier ...
  or by calling a public contract function ... (which leaks that this nullifier is being checked)"
  (`noir-projects/aztec-nr/aztec/src/history/nullifier.nr`, lines 66 to 86). The private context says the same:
  private functions "'prove' non-existence by emitting the nullifier, which would cause the transaction to fail if the
  nullifier existed" (`.../context/private_context.nr`, doc of `assert_nullifier_exists`, from line 708).

### 2.3 Showing a note to several parties

- `note.deliver(mode)` sends it to its owner; `note.deliver_to(other, mode)` sends it to anyone, and one message can
  be delivered several times (`noir-projects/aztec-nr/aztec/src/note/note_message.nr`, lines 11 to 15 and 58 to 75).
- A reader who is not the owner "can see the note was created but **cannot use it** ... The recipient also cannot see
  when/if the note is nullified" (`docs/.../framework-description/note_delivery.md`, line 228). True for the default
  nullifier. With a shared-secret nullifier both parties can compute it and so both can see the note end.
- Three delivery modes. `onchain_constrained()`: "Recipient will always be able to find correctly encrypted content:
  both the encryption and the discovery tag are constrained and stored onchain." `onchain_unconstrained()` and
  `offchain()`: cheaper, but "the sender can fail to deliver or deliver incorrect content" (`note_delivery.md`).
  **Rule for us: whatever the owner needs in order to revoke or audit must be delivered constrained**, because the
  member has a motive to withhold it. The library gives the same warning for shared state: "unless the caller ... is
  incentivized to deliver the note you should use constrained delivery or you are at a risk of a malicious actor
  bricking the contract" (`.../state_vars/single_private_mutable.nr`, lines 83 to 86).
- Constrained delivery needs a handshake between sender and recipient. The default handshake "publishes an onchain
  marker derived from the recipient's address (anyone who knows that address can tell a handshake was created for
  them, though not by whom nor the contents)" (migration notes, "Unconstrained delivery defaults to a non-interactive
  handshake"). Harmless when the recipient address is itself a secret.
- All message ciphertexts have the same length, so log length leaks nothing
  (`noir-projects/aztec-nr/aztec/src/messages/delivery/mod.nr`, doc of `do_private_message_delivery`).

### 2.4 Notes owned by a contract, and escrow keys

- A contract can have keys. Its address commits to them, and whoever holds the secret key can decrypt what is sent to
  that address and nullify notes it owns. `SinglePrivateMutable` is built for this: "The contract that holds this
  state variable must have keys associated with it ... (account contracts or escrow contracts)"
  (`single_private_mutable.nr`, lines 76 to 80).
- The official `Escrow` example is 38 lines: the contract owns token notes, and `withdraw` calls
  `Token.transfer` from itself (`noir-projects/noir-contracts/contracts/app/escrow_contract/src/main.nr`). The wallet
  must hold the escrow's key and name it: `.send({ from: owner, additionalScopes: [escrowContract.address] })`
  (migration notes, "Scope enforcement", example "withdrawing from an escrow contract").
- The Escrow standard (DeFi Wonderland, documented in `docs/.../aztec-nr/standards/escrow.md`) takes it further, and
  is very close to what we need: the owner is baked into the address through the salt, so "authorization [is] a simple
  field comparison against immutable deployment parameters"; the address is computed from keys with "no onchain
  deployment transaction required"; and `_share_escrow` sends the escrow address and its secret keys to an account in
  an encrypted, constrained message, because "Without this notification, the user's PXE would have no way to find the
  escrow or decrypt notes held there."
- A contract with only private functions needs no on-chain presence at all: "No class registration or public
  deployment needed!" (`docs/.../aztec-nr/contract_readiness_states.md`, lines 20 and 56). The docs use this for a
  fully private fee contract: "no onchain deployment transaction is required. Every app just derives the address"
  (`docs/.../aztec-js/how_to_use_private_fee_juice.md`).
- Values fixed at creation can be committed into the address (`immutables_hash`) and checked in a private function
  with `get_contract_instance(self.address)`, which is constrained
  (`noir-projects/aztec-nr/aztec/src/oracle/get_contract_instance.nr`, lines 14 to 22; used that way in
  `noir-projects/noir-contracts/contracts/account/schnorr_initializerless_account_contract/src/main.nr`). The docs
  describe an older way to do the same through the salt, and measure it at about 1,098 gates in an account
  entrypoint (`docs/.../framework-description/immutables.md`).
- **Keys cannot be rotated.** "Protocol keys (nullifier, incoming viewing): Cannot be rotated. They are embedded in
  the address" (`docs/.../foundational-topics/accounts/keys.md`). Whoever once held a contract's key can read that
  address for ever.

### 2.5 The state variables

From `noir-projects/aztec-nr/aztec/src/state_vars/mod.nr` (the two tables at lines 37 to 52) and each file:

| Variable | Where it lives | Read in private? | Who can change it | Use for the allowance |
|---|---|---|---|---|
| `PublicMutable` | public | no | public functions | A public kill switch that only public code can read (design D). |
| `PublicImmutable` | public | yes, free of delay | set once | Fixed public config. It cannot express "not yet set, as of now". |
| `DelayedPublicMutable` | public | yes, the current value | public functions, after a delay | A public kill switch private code can read, after the delay. |
| `Owned<PrivateMutable>` | notes, per owner | by its owner | its owner only | The spike's shape. The owner of the organisation cannot touch it. |
| `Owned<PrivateSet>` | notes, per owner | by its owner | anyone inserts, owner removes | Lets the owner create a note for the member. |
| `Owned<PrivateImmutable>` | one note per owner | by its owner | set once | Fixed terms. |
| `SinglePrivateMutable` | one note, owned by whoever the contract names, guarded by the contract's key | by key holders | key holders, as the contract allows | **Shared state both parties can end** (design C). |
| `Owned<SingleUseClaim>` | a nullifier | existence only | its owner, once | "At most once" rights. |

`DelayedPublicMutable` in detail (`.../state_vars/delayed_public_mutable.nr`):

- A private read is a historical read at the anchor, plus `set_expiration_timestamp(time horizon)` so that the
  transaction is only valid while the value cannot have changed (lines 503 to 528). Cost: "a historical public storage
  read (which is ~4k gates)".
- With nothing scheduled, the horizon is anchor plus delay. With a change scheduled, it is the moment of change,
  "which is public information. This results in an unavoidable privacy leak of any transactions in which a contract
  privately reads a `DelayedPublicMutable` that will change soon" (lines 436 to 441).
- "a delay of at least a couple hours is recommended. From a privacy point of view the optimal delay is
  `MAX_TX_LIFETIME`" (lines 80 to 82). The docs name our use: "contract pauses or access control revocation, where a
  delay of some hours could be acceptable" (lines 57 to 60).
- Its first value also takes the delay to come into force, and an unset variable reads as zero. So a kill switch must
  be "zero means alive".
- Examples: `auth_contract` (one authorised address) and `token_blacklist_contract` (`roles` in a `Map`, delay
  86,400 seconds, read in private on every transfer).

### 2.6 How private code reads time

- `context.get_anchor_block_header()` is free: the kernel checks it once per transaction. "A private function CANNOT
  read from the 'current' block header" (`.../context/private_context.nr`, lines 431 to 448).
  `header.timestamp()` gives the anchor's time.
- Every transaction expires. The context starts with `expiration_timestamp = anchor timestamp + MAX_TX_LIFETIME`
  (`private_context.nr`, line 189), and `MAX_TX_LIFETIME` is 86,400 seconds
  (`noir-projects/noir-protocol-circuits/crates/types/src/constants.nr`, line 184). The kernel caps it
  (`.../private-kernel-lib/src/components/tail_output_composer.nr`) and the rollup enforces it:
  `assert(expiration_timestamp >= block_timestamp)`
  (`.../rollup-lib/src/tx_base/components/private_tail_validator.nr`, lines 143 to 164).
- Block times never go backwards: blocks in one checkpoint share a timestamp, and across checkpoints "must have
  strictly increasing timestamps"
  (`.../rollup-lib/src/checkpoint_root/components/checkpoint_root_inputs_validator.nr`, lines 81 to 86).
- Together: **a private function knows that it lands at a time t with `anchor time <= t <= expiration`**, and the
  interval is at most 24 hours wide.
- `context.set_expiration_timestamp(t)` can only lower the bound (it takes the minimum; `private_context.nr`, line
  648). "This expiry timestamp is publicly visible." The PXE blunts it: it rounds the lifetime down to whole hours
  from the anchor, then half hours, then seconds, "to reduce precision and avoid revealing the exact value"
  (`yarn-project/pxe/src/private_kernel/hints/compute_tx_expiration_timestamp.ts`). A deadline more than 24 hours away
  changes nothing visible. A wallet may also shorten the lifetime of every transaction it sends (`txLifetime` in the
  same file; `expiration_timestamp_upper_bound` in the kernel tail), which is how deadline-bound transactions could be
  hidden among ordinary ones if wallets agreed on a shorter standard.
- Older blocks: `context.get_block_header_at(n)` for any block up to the anchor, about 3k constraints
  (`private_context.nr`, lines 450 to 482). The history module then proves facts as of that block: a note existed, a
  nullifier existed or did not, a public slot held a value (`docs/.../advanced/how_to_prove_history.md`; example
  `claim_contract/src/main.nr`, lines 40 to 45). Old blocks need a node that keeps old state: "Many nodes prune this
  data after a few hours."

### 2.7 Calling public from private, and what it gives away

- A private function can enqueue public calls. They run later, on the sequencer, at the real block time
  (`docs/.../framework-description/calling_contracts.md`).
- It leaks: "The public function execution will be publicly visible", all its arguments, and by default the calling
  contract's address. `enqueue_incognito` hides the caller, but not for a contract's own `only_self` functions
  (`docs/.../resources/considerations/privacy_considerations.md`; `.../contract_self/contract_self_private.nr`, doc of
  `enqueue_incognito`). The number of public calls in a transaction is always visible; counts of notes, nullifiers and
  private logs are padded (`docs/.../resources/considerations/limitations.md`, line 37).
- `privately_check_timestamp(op, value, context)` and `privately_check_block_number` enqueue an incognito static call
  to the shared `PublicChecks` contract, which asserts against the real block time
  (`noir-projects/aztec-nr/aztec/src/public_checks.nr`;
  `noir-projects/noir-contracts/contracts/standard/public_checks_contract/src/main.nr`). They hide *who* asks. They
  publish *what* is asked: the comparison and the timestamp.
- If a public call fails, the transaction is still included and still pays its fee, and everything after the setup
  phase is rolled back, private notes and nullifiers included. If private execution fails, nothing is sent and nothing
  is paid (`docs/.../foundational-topics/transactions.md`, "Transaction phases"; the table at the end of
  `how_to_use_private_fee_juice.md`).

### 2.8 Authwits

An authwit authorises one exact action, once, and is checked by the authoriser's account contract
(`docs/.../foundational-topics/advanced/authwit.md`; the `#[authorize_once]` macro on
`token_contract/src/main.nr`, `transfer_in_private`). The limit that matters to us is stated in a note box at line
166: "spending private notes still requires knowledge of the note secrets. For private tokens, the note owner must be
involved in the transaction — they cannot simply give another user an authwit and have that user spend the notes
independently." **An authwit cannot make a member able to spend the owner's private money.**

### 2.9 Fees without holding the fee token

- Fee Juice is public and non-transferable. A fee-paying contract (FPC) can pay instead. "The Sponsored FPC pays fees
  unconditionally ... It is available on testnet, devnet, and local network. On mainnet, ecosystem-deployed FPCs are
  the practical option" (`docs/.../foundational-topics/fees.md`). The contract itself says "FOR TESTING ONLY"
  (`noir-projects/noir-contracts/contracts/fees/sponsored_fpc_contract/src/main.nr`).
- An application contract can be its own fee payer: `AppSubscription.entrypoint` calls `set_as_fee_payer()` and
  `end_setup()` (`app_subscription_contract/src/main.nr`, lines 91 to 98).
- **The fee payer is public.** "the transaction's fee payer address ... is recorded onchain by the protocol. Every fee
  paid through a given FPC address is therefore publicly tagged with that address"
  (`how_to_use_private_fee_juice.md`, line 69). A fee payer used by one organisation tags that organisation's
  transactions. A fee payer shared by many applications does not.

### 2.10 Partial notes

A note whose owner is fixed in private and whose amount is filled in later, usually in public
(`docs/.../advanced/partial_notes.md`; `token_contract`, `prepare_private_balance_increase` and
`finalize_transfer_to_private`). They pay *into* private balances from public ones, and the amount is public when
completed in public. They do not let anyone spend private money they hold no key for, so they do not solve our custody
problem. They are how "public treasury, private recipient" would be built, and why that shape publishes every amount.

### 2.11 Events

- Private events are encrypted messages: `self.emit(Event {..}).deliver_to(recipient, mode)`, to as many recipients as
  you like, with the same three modes as notes. Only the named recipients can decrypt. "You **must** call
  `deliver_to()` ... If you don't, the event information is lost forever."
- Public events are plaintext logs from public functions (`docs/.../framework-description/events_and_logs.md`).
- A failed private function emits nothing at all. There is no on-chain record of a refusal.

### 2.12 The app subscription contract, read closely

`noir-projects/noir-contracts/contracts/app/app_subscription_contract/src/main.nr`. It is the nearest official
example: a right that is counted down and runs out at a time.

| What it does | How | What we take from it |
|---|---|---|
| Holds the right as a note per user: `{ expiry_block_number, remaining_txs }` | `Owned<PrivateMutable<SubscriptionNote>>` (line 61) | The counter is a note replaced on each use. Same as our "spent". |
| Counts down | `replace` with a closure that asserts `note.remaining_txs > 0` and returns the note with one fewer, delivered constrained (lines 76 to 89) | Refusal from inside the replace. Constrained delivery of the new note. |
| Checks expiry | `privately_check_block_number(Comparator.LT, expiry, context)`: a public check at inclusion through `PublicChecks` (line 102) | It publishes the expiry value on every call. We can do better with the anchor and the expiration timestamp (section 3). |
| Bounds the length at purchase | A second public check that the expiry is not too far ahead (lines 142 to 146) | Not needed when boundaries are fixed at grant. |
| Pays the user's fee | `set_as_fee_payer()`, `end_setup()` (lines 91 to 98) | The pattern for sponsored spending. |
| Lets the user act through it | `assert_current_call_valid_authwit(context, user_address)` (line 71) | An entrypoint acting for a user. |
| Revokes | It does not. The note is the user's; the application has no way to end it. | **The official example has the same gap the spike found.** |

### 2.13 Testing: what the tools can and cannot show

- TXE (`aztec test`): accounts, contracts with keys, private calls with extra scopes, and a chosen anchor block
  (`noir-projects/aztec-nr/aztec/src/test/helpers/test_environment.nr`: `with_additional_scopes`,
  `at_anchor_block_number`, `with_secret`). Time: `env.mine_block_at(t)`, `env.set_next_block_timestamp(t)`,
  `env.advance_next_block_timestamp_by(d)`; the last two do "not affect private execution"
  (`docs/.../aztec-nr/testing_contracts.md`, lines 301 to 311). Every call is its own block.
- **TXE does not appear to enforce the expiration timestamp.** Its public path builds the transaction with
  `expirationTimestamp` zero (`yarn-project/txe/src/oracle/txe_oracle_top_level_context.ts`, line 782) and I found no
  check of it on the private path. To be confirmed by the spike. If so, "this spend is too late to land" can only be
  tested on a real network.
- Local network: `node.warpL2TimeAtLeastTo(t)` and `warpL2TimeAtLeastBy(d)` move both clocks
  (`yarn-project/aztec/src/testing/cheat_codes.ts`).
- The local network's sequencer does not verify proofs (the spike's own finding). A journey that passes there is
  evidence about logic and about what a transaction shows, not about soundness.
- The whole stack is alpha. "The Aztec stack is unaudited ... Do not use real, meaningful secrets on Aztec networks"
  (`docs/.../resources/considerations/limitations.md`).

---

## 3. What can be proven about time

"Now" means the timestamp of the block the transaction lands in.

| Where | Claim | Provable? | How | What it costs or leaks | Source |
|---|---|---|---|---|---|
| Private | The exact value of now | **No** | Private code runs before the block exists. | | `aztec-nr/aztec/src/context/private_context.nr`, lines 431 to 448 |
| Private | The anchor block's time | Yes, free | `context.get_anchor_block_header().timestamp()` | The anchor block is visible on the transaction. | same; `noir-protocol-circuits/crates/types/src/abis/block_header.nr` |
| Private | now >= anchor time | Yes, by protocol | Blocks land after their anchor; block times never decrease. | | `rollup-lib/src/checkpoint_root/components/checkpoint_root_inputs_validator.nr`, lines 81 to 86 |
| Private | **now >= T** ("T has passed") | **Yes, privately, free** | `assert(anchor_time >= T)` | Nothing. It can only be proven once a block at or after T exists, so about one block late. | follows from the two lines above |
| Private | now <= anchor time + 24 h | Yes, always | Default expiration; kernel caps it; rollup rejects late transactions. | Nothing: every transaction has it. | `private_context.nr`, line 189; `types/src/constants.nr`, line 184; `private-kernel-lib/src/components/tail_output_composer.nr`; `rollup-lib/src/tx_base/components/private_tail_validator.nr`, lines 143 to 164 |
| Private | **now <= T** ("T has not passed") | **Yes, enforced by the protocol** | `context.set_expiration_timestamp(T)` | The expiration is public. Unchanged if T is more than 24 h after the anchor. Otherwise a shorter lifetime shows, rounded to the hour by the PXE. | `private_context.nr`, lines 616 to 649; `yarn-project/pxe/src/private_kernel/hints/compute_tx_expiration_timestamp.ts` |
| Private | Time since my last action, exactly | No | Only bounds: both actions have intervals. | | follows |
| Private | A fact held at an older block (a note existed, a nullifier did or did not, a public slot's value) | Yes | `get_block_header_at(n)` then `aztec::history::*` | About 3k constraints for the header, about 4k per proof. Needs a node that kept the old state. | `private_context.nr`, lines 450 to 482; `aztec-nr/aztec/src/history/`; `docs/.../advanced/how_to_prove_history.md` |
| Private | A nullifier does not exist **now** | Only by emitting it | Emitting fails the transaction if it exists. | One nullifier. This is the only private statement about now. | `aztec-nr/aztec/src/history/nullifier.nr`, lines 66 to 86 |
| Private | A nullifier did not exist as of the anchor | Yes | `assert_nullifier_did_not_exist_by(anchor_header, siloed)` | About 4k gates. Stale by up to the expiration. The node that serves the witness learns which nullifier you asked about. | `history/nullifier.nr`, lines 90 to 118 |
| Private | A public value is still current | Only for `PublicImmutable`, or `DelayedPublicMutable` | Historical read, plus an expiration set to when it could change | About 4k gates. Expiration = anchor + delay, or the public time of a scheduled change. | `state_vars/delayed_public_mutable.nr`, lines 415 to 528 |
| Public | The exact value of now | Yes | `context.timestamp()`, `context.block_number()` | Everything in a public function is public. The proposer has some freedom; all transactions in a block, and all blocks in a checkpoint, share it. | `aztec-nr/aztec/src/context/public_context.nr`, `block_number` at line 569 and `timestamp` at line 592 |
| Public | now compared with anything, exactly | Yes | Ordinary comparison | Public. | same |
| Private to public | now compared with a value chosen in private, at inclusion | Yes | `privately_check_timestamp(op, value, context)`: an incognito static call to `PublicChecks` | The value and the comparison are published. The caller is hidden. One public call shows on the transaction. If it fails, the app phase is undone and the fee is still paid. | `aztec-nr/aztec/src/public_checks.nr`; `noir-contracts/contracts/standard/public_checks_contract/src/main.nr`; `docs/.../foundational-topics/transactions.md` |
| Private to public | The same, against the contract's own public state | Yes | `self.enqueue_self.some_public_fn(args)` | The contract's address, the function and the arguments are published. | `docs/.../considerations/privacy_considerations.md`; `contract_self/contract_self_private.nr` |
| Tests (TXE) | Anchor time and landing time, set separately | Yes | `mine_block_at`, `at_anchor_block_number`, `set_next_block_timestamp` | Expiration seems not to be enforced. | `docs/.../aztec-nr/testing_contracts.md`, lines 301 to 311; `yarn-project/txe/src/oracle/txe_oracle_top_level_context.ts`, line 782 |

The line to remember: **a private function can prove a lower bound on now for free and in secret, and an upper bound
on now in public.** A month needs one of each.

---

## 4. Two consequences that shape every design

### 4.1 Revoke: pick two of three

From section 2.2: the only thing a private transaction asserts about the present is that its own nullifiers are new.
So there are exactly three ways to stop a spend.

| Way | The owner does | The spend does | When it bites | What it costs |
|---|---|---|---|---|
| **Pre-empt** | Emits the nullifier the next spend needs | Emits it too, and fails | The block the owner's nullifier lands in | The state must be destroyable by both parties. The two transactions race: whichever lands first wins, and the loser can never be included. |
| **Tombstone** | Emits a marker nullifier, or schedules a `DelayedPublicMutable` | Proves the marker absent as of its anchor | Within the transaction lifetime: 24 hours, or a shorter N the contract sets | A window. A shorter N narrows every transaction's lifetime, which is visible. |
| **Public gate** | Writes a public flag | Enqueues a public call that reads the flag at inclusion | The next block, with no race | Every spend makes a public call naming the allowance, so spends are linkable and timed in public. |

Stated as a rule: **unlinkable spends, revoke with no race and no window, and a member who spends alone: any two, not
all three.** Giving up the third (the owner co-signs every spend, like a card authorisation) is possible, and is noted
in section 5.5.

The race in "pre-empt" is bounded, and worth understanding exactly. If the member's spend lands first, the owner's
revoke can no longer be included (a transaction with a spent nullifier is invalid; the docs say a transaction that
is not included pays no fee, which the spike should confirm for this case), and the owner retries against the new
note, which constrained delivery guarantees they receive. A member who watches the pool and races every retry must
make a real spend each time, so in total they get what was left this month and no more, which they could have taken
in one transaction anyway. The only way racing gains anything is by surviving into a new month. So the design must
make future months die in a way the member cannot race. Designs B and C do.

### 4.2 Money: a limit on a shared pot needs a shared key

From 2.8 and 2.4: to move a private token note you must be able to nullify it, which takes the nullifier key of the
address that owns it. Contract logic decides whether you *may*; the key decides whether you *can*.

| Where the money sits | Who must hold a key | Who learns what | Money set aside? |
|---|---|---|---|
| **Shared vault**: one contract per organisation owns the token notes | Every member holds the vault's secret key | Every member can decrypt every note sent to the vault and see every vault note spent: all amounts of all members' spends, though not who or to whom. A removed member keeps that view for ever, since keys cannot be rotated; closing it means moving the treasury to a new vault. Members also collide when they pick the same note. | No |
| **Pocket**: one keyed address per allowance, funded by the owner | Owner and that member | Only the two of them | Yes: at least the current month |
| **Public treasury**: the vault holds a public balance and pays out with `transfer_to_private` | Nobody | The public sees every amount. Recipients stay hidden. | No |

There is no fourth row in the standard token. This is the real reason the Solidity shape, one vault per organisation,
does not port: on Ethereum the vault's code is the only gate; on Aztec the vault's key is a second gate, and a key
that is shared is a view that is shared.

---

## 5. The designs

Each is described the same way: the shape, how each move works, exactly what it promises and to whom, what it leaks,
what it trusts, how it fails, and what it costs. Costs use the documented kernel figures: about 290k gates fixed per
transaction, and about 101k for each private call after the first
(`docs/.../advanced/writing_efficient_contracts.md`, line 50). Real proving times are for the spike to measure.

### 5.1 Design A: the member's note, revoked by delay

The spike's shape, made revocable. Smallest step from where we are.

**Shape.** One vault contract per organisation, with keys, holding the treasury (shared-vault custody from 4.2). The
allowance is one note owned by the member: `{ id, grantor, limit, spent, month, boundaries, tombstone_secret }`, kept
in `Owned<PrivateSet<AllowanceNote>>` so the owner can create it. No public state.

| Move | How |
|---|---|
| grant | Owner: emit a once-only nullifier for the id; insert the note for the member; deliver to the member and to the owner. |
| spend | Member: take the note (their own key). Work out the month from the anchor time; if it is later than the note's month, zero `spent`. Check the amount. **Prove the tombstone absent as of the anchor.** Insert the new note; deliver it to the member, and to the owner constrained. Pay from the vault. |
| revoke | Owner: emit the tombstone nullifier `hash(tombstone_secret)`. Nothing else. |
| reset | Not a transaction. The next spend sees a later month and starts from zero. |
| expire | Not a transaction. Spend asserts the anchor is before `B12`, and sets the expiration to `B12`. |

```noir
// revoke (owner)
self.context.push_nullifier_unsafe(tombstone(note.tombstone_secret));

// spend (member), after the usual checks
let anchor = self.context.get_anchor_block_header();
assert_nullifier_did_not_exist_by(anchor, compute_siloed_nullifier(self.address, tombstone(secret)));
// only if the promise is tighter than 24 hours:
self.context.set_expiration_timestamp(anchor.timestamp() + REVOKE_WITHIN);
```

A stock variant swaps the tombstone for `revoked: Map<Field, DelayedPublicMutable<bool, DELAY>>`, read in private
exactly as `token_blacklist_contract` reads `roles`. It is stock library code and the public can see a revoke
happen; in exchange the revoke is a public write, and in 6.0 the delay is at least an hour.

**Promises.**

| To | Promise |
|---|---|
| Owner, on revoke | It bites **within N**, N being 24 hours by default. Until then the member can spend what is left, and **if a month boundary falls inside N, one more month's limit as well.** Nothing after N, ever. Revoke needs nothing from the member. |
| Owner, on visibility | Sees every new version of the note, so sees `spent`, because delivery to them is constrained. |
| Member | Spends alone. Nobody but the member can touch the note. |
| On time | A month is counted from the anchor, so a spend can be charged to the old month up to 24 hours into the new one, unless the expiration is also set to the boundary. Expiry is exact. |
| The public and sequencers | See nothing that marks an allowance: private transactions with a default lifetime (with N = 24 h). With the `DelayedPublicMutable` variant they see that some allowance of this vault was revoked, and when. |
| Other members | See the vault's notes: the amounts of everyone's spends (shared-vault custody). |

**Leaks.** The node that serves the non-inclusion witness learns the tombstone value on every spend, a stable tag for
this allowance, unless the member runs their own node. A shorter N shows as a shorter lifetime on every spend.

**Trusts.** The member's wallet with the note (lose the key, lose the note; the owner can still revoke). Every member
with the vault's view.

**Fails when.** A member chooses the oldest allowed anchor on purpose: this is exactly what N bounds. Two members pick
the same treasury note: one is dropped and retries.

**Cost.** Per spend: entrypoint, fee contract, vault, token: four private calls, about 290k + 3 x 101k kernel gates,
plus one roughly 4k-gate membership proof. No public call. Grant and revoke are one call each.

**Complexity.** Low. One note type, one history proof, lazy month arithmetic.

### 5.2 Design B: twelve vouchers in the vault, that either party can destroy

The closest port of "one vault per organisation" that still revokes at once.

**Shape.** One vault per organisation, shared-vault custody. At grant the owner mints twelve voucher notes, one per
month: `{ id, month, from, until, limit, spent, grantor, end_secret }`. They are `#[custom_note]`s whose nullifier is
`hash(note hash, end_secret)`: no key, so whoever knows the note can end it, and the vault's functions decide who is
allowed to. Each is delivered to the member and to the owner, never to the vault's address, which every member can
read.

```noir
impl NoteHash for VoucherNote {
    fn compute_nullifier(self, _context: &mut PrivateContext, _owner: AztecAddress, note_hash_for_nullification: Field) -> Field {
        compute_note_nullifier(note_hash_for_nullification, [self.end_secret])
    }
    // compute_note_hash as the #[note] macro writes it
}
```

| Move | How |
|---|---|
| grant | Owner: once-only nullifier for the id; twelve notes. Twelve notes fit one call (limit 16); twenty-four deliveries do not, so grant is two calls. |
| spend | Member: take voucher k. Assert `anchor >= from`; set the expiration to just before `until`. Check the amount. Put back a voucher with more spent, delivered to the owner constrained. Pay from the vault. |
| revoke | Owner: nullify every voucher still alive. The future ones are exactly as the owner made them, so this cannot be raced. The current one is whatever version the owner last received; it can be raced once at a time (4.1). Send them as two transactions so a race on the current month cannot block the rest. |
| reset | **Nothing.** Month k+1 is a different note. |
| expire | **Nothing.** There is no thirteenth voucher. |

**Promises.**

| To | Promise |
|---|---|
| Owner, on revoke | Future months are dead **the moment the revoke lands, unconditionally.** The current month stops at once unless the member lands a spend first; in every case the member gets at most what was left this month. No window, no N. |
| On time | The year's schedule is fixed at grant and no circuit does date arithmetic. A voucher cannot be used early (proven privately) or late (expiration), exactly. |
| The public and sequencers | Nothing that marks an allowance, except a shorter lifetime on spends in the last 24 hours of a month. |
| Other members | The vault's notes, as in A. Not the vouchers. |

**Leaks.** As above. A grant is a visibly larger transaction unless wallets pad.

**Trusts.** Both wallets with the `end_secret`. Every member with the vault's view.

**Fails when.** The limit must change: the vouchers are fixed, so it is revoke and grant again. Treasury notes
collide, as in A.

**Cost.** Spend as in A without the history proof. Grant: twelve notes, two calls. Revoke: up to twelve nullifiers.

**Complexity.** Medium. A custom note is the one non-stock piece, and custom nullifiers are where audits look first.

### 5.3 Design C: a pocket per allowance (recommended)

The allowance is an account. Owner and member both hold its key.

**Shape.** No vault contract. Each allowance is its own instance of one small contract class, `AllowancePocket`:

- **Its address commits to its terms.** Owner, member, token, limit and the thirteen boundaries are hashed into
  `immutables_hash`, so they are fixed and cost nothing to store (2.4).
- **It has its own keys**, derived by the owner from the owner's secret and the allowance id, so the owner can always
  recompute them. The member is given the secret key once.
- **It is never deployed.** It has only private functions, so it needs no class registration and no instance on
  chain. Nobody outside the pair can know it exists.
- **It holds its own money**: token notes owned by the pocket's address. The owner funds it with an ordinary private
  transfer.
- **Its state is one counter per month**: `spent: Map<month, SinglePrivateMutable<UintNote>>`. Stock library types,
  owned and guarded by the pocket's key, which both hold. Every note it creates is delivered once, to the pocket's own
  address, constrained, and both parties read it.

| Move | How |
|---|---|
| grant | Not a contract call. The owner's client computes the boundaries, derives the key and the address, sends tokens to the address, and sends the member the key and the terms (off chain, or as an encrypted event, as the Escrow standard's `_share_escrow` does). |
| spend | Member calls the pocket: see the sketch. One nullifier ends this month's counter note, or opens the month. That nullifier is the proof, as of landing, that the month is not revoked and not already spent past. |
| revoke | Owner calls the pocket. For every month from now to the end: if the month was opened, nullify its counter note and put nothing back; if not, open it dead. An unopened month's opening nullifier depends only on the slot and the pocket's key, so the owner needs nothing from the member; and for months that have not begun the member cannot get there first, because `spend` refuses them. Send the future months and the current month as two transactions, so a race on the current month cannot block the rest. Then transfer the pocket's balance back to the owner. |
| reset | **Nothing.** Month k+1 is a different slot, untouched until first used. |
| expire | **Nothing.** `month < 12` and the last boundary. The owner then takes back what is left. |

```noir
// A sketch against aztec-nr v5.3.0 names. Not compiled.
#[storage]
struct Storage<Context> {
    spent: Map<Field, SinglePrivateMutable<UintNote, Context>, Context>,   // one slot per month
}

#[external("private")]
fn spend(terms: Terms, month: u32, amount: u128, recipient: AztecAddress) {
    // the terms are the ones this address was made from
    assert_eq(terms.hash(), get_contract_instance(self.address).immutables_hash);
    assert(self.msg_sender() == terms.member);                      // role

    assert(month < 12);                                             // expired otherwise
    let anchor_time = self.context.get_anchor_block_header().timestamp();
    assert(anchor_time >= terms.boundary[month]);                   // the month has begun: private, free
    assert(anchor_time < terms.boundary[month + 1]);
    self.context.set_expiration_timestamp(terms.boundary[month + 1] - 1);   // and will not have ended

    self.storage.spent.at(month as Field)
        .initialize_or_replace(|current| {
            let before = current.map_or(0, |note| note.value);
            assert(before + amount <= terms.limit);                 // AllowanceExceeded { remaining }
            UintNote { value: before + amount }
        }, self.address)
        .deliver(MessageDelivery::onchain_constrained());           // to the pocket: both parties read it

    // from the pocket's own notes; change returns to the pocket with constrained delivery
    self.call(Token::at(terms.token).transfer_in_private(self.address, recipient, amount, 0));

    self.emit(AllowanceSpent { month, amount, recipient })
        .deliver_to(self.address, MessageDelivery::onchain_constrained());
}
```

Three details the sketch depends on, each from the source:

- `initialize_or_replace` is safe against a lying wallet: it "will either initialize the state variable, which would
  fail if it was already initialized due to the duplicate nullifier, or replace the current value, which would fail if
  it was not initialized" (`single_private_mutable.nr`, lines 192 to 200).
- `transfer_in_private`, not `transfer`: the first delivers the change note constrained, the second does not
  (`token_contract/src/main.nr`, lines 212 to 232 and 271 to 277). With unconstrained change a hostile member could
  hide the pocket's remaining money from the owner.
- Both wallets must register the pocket with its key and name it in each call:
  `wallet.registerContract(instance, artifact, secretKey)` and `additionalScopes: [pocket]`.

**Promises.**

| To | Promise |
|---|---|
| Owner, on revoke | Every month that has not begun is dead **the moment the revoke lands, unconditionally and without the member's data.** The current month stops at once unless the member lands a spend first; in every case the member gets at most what was left this month. Then the money comes back. No window. |
| Owner, on visibility | Reads everything in the pocket with the pocket's key: balance, each counter, each spend event, the recipient if the event carries it. No cooperation needed. |
| Member | Spends alone, and never collides with any other member. Sees their limit, what is left, and the balance. |
| On time | Lower edge of a month: exact, private. Upper edge and expiry: exact, enforced by the protocol. Reset and expiry cannot be late or wrong, because nobody performs them. |
| The public and sequencers | **Nothing.** No public state, no public call, no deployed contract. Only private transactions whose note, nullifier and log counts a wallet pads. Two visible traces remain: the fee payer, and a shorter lifetime on spends in the last 24 hours of a month, rounded to the hour. |
| Other members | **Nothing.** They hold no key that opens this pocket. |
| Recipient | Their payment. Whether the way the note is tagged also shows them which address paid is for the spike to check. |
| Architect's server | Nothing but its own telemetry. |

**Leaks.** The two traces above. Quantised boundaries shrink the second. The node a wallet talks to learns which notes
it asks about, as for every Aztec application (`privacy_considerations.md`, "Data queries").

**Trusts.**

- The member with the pocket's key: they can read the pocket for ever, and can do with it only what `spend` allows.
  After a revoke they hold a key to an empty pocket.
- The owner's client to compute honest boundaries. A wrong schedule harms only the owner. The pocket can check sanity
  cheaply (increasing, 28 to 31 days apart).
- The channel that carries the key to the member.
- The pocket's code to be the only gate. The class must have no entrypoint and no authwit function, so that the key
  alone moves nothing: the token only lets the pocket itself, or someone the pocket's code vouches for, move its
  notes (`token_contract/src/main.nr`, `#[authorize_once("from", "authwit_nonce")]`).
- A pattern (keyed, undeployed, shared escrow) documented in the standards and built on stock types, but, like all of
  Aztec, unaudited.

**Fails when.**

- **The pocket is empty.** The limit says yes and the balance says no. That is a new refusal, `AllowanceUnfunded`. How
  far ahead to fund is the owner's choice, from one month (and a monthly top-up job on the owner's side) to the whole
  year (and nothing to run).
- **The member races the revoke.** Bounded as in 4.1: this month's remainder, never a later month.
- **The member's device is lost.** The owner re-derives the key and shares it again, or revokes.
- **The limit must change.** The terms are the address. A new limit is a new pocket.

**Cost.** Spend: entrypoint, fee contract, pocket, token: four private calls, about 290k + 3 x 101k kernel gates plus
the two application circuits. No public call, so the cheapest kind of transaction to include. Grant: one token
transfer and one message. Revoke: up to twelve nullifiers and one token call. Constrained delivery adds proving time
to each note; the spike should measure it.

**Complexity.** Medium, of a different kind: little contract code, all of it stock, but new machinery around it: an
instance per thing, key derivation and sharing, funding.

**An optional second lock.** If a current-month race is unacceptable (the stolen device of 1.5), add design A's
tombstone to `spend`. Then even a member who wins every race is stopped within N.

### 5.4 Design D: a public gate

Solidity's guarantees, bought with metadata.

**Shape.** One vault per organisation, published, with public state: for each allowance, under an opaque key,
`{ revoked, start }` in a `PublicMutable`. Amounts stay in a member-owned private note as in A. Each spend enqueues a
public call to the vault's own `_gate(key, month)`, which runs at inclusion and asserts not revoked, month correct for
the real block time, and not expired.

| Move | How |
|---|---|
| grant | Owner: private note for the member, plus a public write of the record. |
| spend | Member: private arithmetic and payment, then `self.enqueue_self._gate(key, month)`. If the gate fails in public, the private effects are undone and the fee is still paid. |
| revoke | Owner: one public write. |
| reset | Checked in public against the real block time. Exact. |
| expire | The same. Or a keeper flips the flag: the state is public, so a narrow key suffices, as in the Solidity version. |

**Promises.**

| To | Promise |
|---|---|
| Owner, on revoke | **The next block. No race, no window**: ordering in the block decides, as on Ethereum. |
| On time | Exact, at inclusion, to the block. |
| The public and sequencers | Do not learn amounts, limits or recipients. **Do learn**: that this organisation's vault has an allowance with this key; every time it is used; in which month; when it was granted and revoked. Spends of one allowance are linkable to each other. |
| Other members | The vault's notes, as in A. |

**Leaks.** All of the above, by construction. An incognito call hides the vault but not the key; rotating the key each
spend only moves the link into a chain.

**Trusts.** Nothing new.

**Fails when.** A refused spend costs a fee, because the refusal happens in public.

**Cost.** Everything in A plus a public call on every spend: sequencer execution, network-side proving, a higher fee.

**Complexity.** Low, and familiar: it is the Solidity design with the amounts taken out.

### 5.5 Considered and set aside

| Idea | Why not |
|---|---|
| **Owner-held capability notes the member redeems with an authwit** | An authwit does not carry the ability to nullify the owner's notes (2.8). Issuing a fresh authwit for each spend makes the owner co-sign every spend; see the next row. |
| **The owner approves every spend** (a card authorisation) | It gets all three of 4.1 by dropping H8: the owner, or a service holding the owner's keys, must be online for every spend, and sees every amount. A real product shape; not this one. |
| **A public allowance with private payments** (limit and spent in public storage) | Updating a public `spent` publishes each amount. Fails H6. |
| **A public treasury paying into private notes** | `transfer_to_private` publishes the amount (2.10). Fails H6. |
| **A `PublicImmutable` revocation flag** | A private read of it is historical; "not set, as of now" cannot be proven. Only `DelayedPublicMutable` is built for that. |
| **Expiry as a time stored in `DelayedPublicMutable`** | Works only as a kill time where zero means none. That is design A's stock variant. As the *original* expiry it fails: a first write takes the delay to come into force. |
| **A pre-funded pocket with no logic** (the balance is the allowance; the owner tops up monthly) | Simplest of all and fully private, but reset becomes a job the owner must run and the contract enforces no machine. Design C keeps its privacy and adds the rules. |
| **The vault itself pays the fees** | The fee payer is public, so every spend would be tagged with the organisation. Use a fee payer shared across applications. |

### 5.6 Side by side

| | A: member's note, delay | B: vouchers in the vault | C: pocket | D: public gate |
|---|---|---|---|---|
| Revoke bites | within N (24 h free) | at once; first to land | at once; first to land | next block, no race |
| Worst case after revoke | what is left, plus a month if a boundary is inside N | what is left this month | what is left this month | nothing |
| Revoke needs the member's data | no | the current voucher (guaranteed by constrained delivery) | no for unopened months; the current counter otherwise | no |
| Reset | arithmetic on the anchor | structural | structural | public check |
| Month edges | lower exact; upper within 24 h, or exact with a visible deadline | exact | exact | exact |
| The public sees | nothing | nothing | nothing | every use, per allowance |
| Other members see | all vault amounts | all vault amounts | nothing | all vault amounts |
| Money set aside | no | no | yes | no |
| Public calls per spend | 0 | 0 | 0 | 1 |
| A refused spend costs a fee | no | no | no | yes, if refused at the gate |
| Non-stock parts | none | custom nullifier | instance per allowance, shared key | none |
| Meets H6 (privacy from other members) | no | no | **yes** | no |
| Meets H4 without a caveat | no | yes | yes | yes |

---

## 6. Recommendation

**Build design C, the pocket per allowance.** Offer design A's tombstone as an optional second lock.

Why:

1. **It is the only design that meets every hard requirement.** A, B and D fail H6 between members, because a shared
   vault is a shared view, and that view outlives a member's removal. A also carries a caveat on H4.
2. **Reset and expiry are correct by construction.** No code performs them, so no code can get them wrong, and no
   clock is read to do them. This is the answer to "which design makes revoke and reset trivially correct": reset by
   giving each month its own slot; revoke by letting the owner end the slots with a key they already hold.
3. **Revoke is as strong as a private design can be** (4.1): future months die unconditionally, the present month is
   first-to-land, and the worst case equals what was already at risk.
4. **Its public footprint is nothing**, which is the point of choosing Aztec.
5. **It is mostly stock code**: `SinglePrivateMutable`, `Map`, `UintNote`, the standard token, and the escrow pattern
   from the documented standards. The one custom nullifier design (B) is avoided.
6. **It is the cheapest to run**: no public call, no published contract.

What we give up:

- **"One vault per organisation."** The organisation's money sits in the owner's account and in pockets. This is a
  prepaid card, not a charge card. Someone must decide how far ahead to fund, and if the answer is one month, the
  owner runs a top-up job. This is a product decision for Aaron: it changes what the owner experiences.
- **Race-free revoke.** Only D has it, at the price of publishing every use.
- **A changeable limit.** New terms are a new pocket.
- **A stored state.** Active, exhausted, revoked and expired are no longer a column; they are computed from notes and
  the clock (section 7).
- **An ordinary deployment story.** Each allowance is an instance with keys that must be derived, shared and kept.

If Aaron will not accept setting money aside: **B**, knowing that members can read the treasury's notes. If he wants
Ethereum's exact semantics and accepts public metadata: **D**. A is the fallback only if we must stay closest to the
current spike.

---

## 7. What it means for Architect

### 7.1 New primitives

Each is something a project would declare once, in the blueprint, and each target would then have to honour or refuse.

| Primitive | What it declares | Needed by | What the generator and the checks do with it |
|---|---|---|---|
| **Audience** of every field: of a thing, a payload, an answer, an event, a refusal | Who may ever learn it: `public`, `parties(roles)`, `caller` | all | A non-public field can never reach public storage, a public call's arguments, a public log, or telemetry. Generation fails if a declaration would put it there. Refusal fields are covered too: `AllowanceExceeded { remaining }` reaches the member, and telemetry gets the tag alone. |
| **Where an operation runs**, per target | `private` (the caller's device), `public` (the sequencer), `private then public`, `view` (unproven, local) | all | Chooses `#[external("private")]`, `("public")` or `("utility")`. On a Noir target there is no server handler: the "handler" is a circuit run in the caller's wallet. |
| **Steps of new kinds** | `sync` (the wallet finds its notes), `simulate`, `prove`, `send`, `wait: inclusion`, `wait: finality` | all | Spans on the client. `prove` will dominate budgets and has no server equivalent. |
| **Holders of a thing** | Who can read its state, and who can end it: `caller`, `shared(roles)`, and by which means (own key, shared secret, instance key) | A, B, C | Chooses note ownership, delivery lists and delivery modes. Rule generated from it: anything a holder needs but another party creates is delivered constrained. |
| **When a move takes effect** | `at inclusion`, `first to land`, `within(N)`, `after(D)` | all | The honest statement of revoke. Generates the conformance test that proves the bound and the worst case, and the copy shown to the owner. |
| **A time model per target** | What "now" a handler may use (next table) | all | A time move declared with a guarantee the target cannot give is a generation error, not a runtime surprise. |
| **Passive time moves** | A move that happens because time passed, with no transaction and no sender | A, B, C | See 7.2. Its event is derived by observers, not emitted. |
| **Derived state** | The machine's state as a function of (notes, a lower bound on now), not a stored value | A, B, C | One function generated twice, in Noir (a view function) and in TypeScript, and a test that the two agree on generated vectors. Replaces the SQL CHECK constraint. |
| **Where a refusal is decided** | `in simulation` (no transaction, no fee), `at inclusion` (dropped, no reason given), `in public` (included, reverted, fee paid) | all | The client maps each to the declared refusal. A dropped transaction carries no reason, so the client re-syncs and names it: nullifier already present means revoked or a concurrent spend. The deciding log is written by the client. |
| **An instance per thing** | A thing whose every instance is its own contract address, made from its fixed fields | C | `grant` becomes: derive, fund, share. Generates the address derivation in TypeScript and its check in Noir. |
| **Key material** | For a thing: who generates its key, who holds it, how it travels, how it is recovered | B, C | Never the server. A journey's cast must carry keys between actors. |
| **Custody** | `pocket`, `shared`, `public`, with what each shows to whom | all | Makes 4.2 a declared choice instead of an accident. Adds the `Unfunded` refusal for `pocket`. |
| **Fee policy** | Who pays, through which fee contract; the payer is public | all | Replaces the relayer. Generated check: the payer is not specific to one organisation. |
| **Public footprint** | What an operation's transaction may show: public calls and their arguments, lifetime (default or not), fee payer | all | **A new eval: privacy, measured.** After each journey step, compare the transaction's public effects with the declaration. A spend that suddenly makes a public call fails its proof. |
| **Finality of an answer** | proposed, checkpointed, proven | all | "Revoked" shown to an owner should say which. |

### 7.2 The rule for time moves on a Noir target

The time model each target can honestly offer:

| Target | The "now" a handler can use | Width | Who can fire a time move |
|---|---|---|---|
| Effect (a server) | the server's clock | milliseconds; you trust the server | a scheduler |
| Solidity | the block's timestamp, at inclusion | one slot | the next caller, lazily; or a keeper with a narrow key |
| Noir, public | the block's timestamp, at inclusion | one slot; shared by a checkpoint | the next caller; or a keeper, for public state only |
| Noir, private | an interval: `anchor time <= now <= expiration` | up to 24 hours; the lower end exact and secret, the upper end public | **nobody** |

**The rule.** On a Noir target, a time move over private state is a guard on the next operation, never a transaction
of its own.

It may rely on:

1. Instants fixed when the thing was created, and committed (boundaries, never durations to be added later).
2. "This instant has passed", proven from the anchor block's timestamp.
3. "This instant has not passed", enforced by the transaction's expiration, accepting that the deadline shows publicly
   when it is under 24 hours away, and rounding instants so that many things share them.
4. The uniqueness of a nullifier, for anything that must be true at the moment of landing.
5. A structure in which the state after the move already exists and is merely untouched: a slot per period, a note per
   period.

It may not rely on:

1. Reading the current time, or computing an exact elapsed time.
2. A keeper. A third party with a narrow key cannot change private state, because it holds neither the notes nor the
   keys. A time move that must do something at a moment when no party acts needs a party's own agent, or public state.
3. Public state that can change, unless it is a `DelayedPublicMutable` and the declared guarantee includes its delay.
4. An event emitted on chain. The move has no transaction. Observers derive `AllowanceReset` and `AllowanceExpired`
   from the committed instants and their own clock.
5. Precision the interval does not have. A declared tolerance of less than 24 hours on an upper bound must name the
   public deadline as its price.

A consequence for the machine: with passive moves, "from the wrong state" refusals such as
`AllowanceCannotSpend { state: expired }` are decided from derived state, in the caller's wallet, before any
transaction exists.

### 7.3 What each generated part becomes on this target

| Architect generates | On Noir |
|---|---|
| Types, events, errors | Note structs, `#[event]` structs with recipients from the audience, assertion messages. Whether a Noir assertion can carry a typed payload the client decodes is for the spike. |
| The machine, compiled in | Guards in each private function, plus the derived-state function. "State can only move as declared" is enforced by constraints and by nullifier uniqueness, not by a stored enum. |
| A scaffold with blanks | One function per operation with role check, time guards, the state update and deliveries written, and the business rule left blank. |
| Conformance tests | TXE tests: each move from each state, each refusal, time guards by choosing the anchor (`mine_block_at`, `at_anchor_block_number`). What TXE cannot show (expiration enforced, two transactions racing, public footprint) is generated as journeys for a local network. |
| An Effect client | Wraps the wallet: sync, simulate, prove, send, wait. It runs on the caller's machine. It owns key handling for instance things. |

### 7.4 How a declaration might read

Illustrative only: the names on the right of each colon are invented here, to show where the new facts would live.

```ts
// blueprint/things/allowance/thing.ts
export const Allowance = Blueprint.thing("allowance", {
  id: AllowanceId,
  owner: PersonId,
  member: PersonId,
  limit: Amount,        // audience: parties(owner, member)
  spent: Amount,        // audience: parties(owner, member)
  boundaries: Instants, // thirteen, fixed at grant
}, {
  audience: Audience.parties(Roles.owner, Roles.member),       // the default for every field, event and refusal
  noir: { instance: true, holders: Holders.shared(Roles.owner, Roles.member), custody: Custody.pocket },
})

// blueprint/things/allowance/machine.ts
export const machine = Blueprint.machine(Allowance, {
  start: "active",
  states: ["active", "exhausted", "revoked", "expired"],
  moves: {
    spend:  { from: ["active"], to: ["active", "exhausted"], emits: AllowanceSpent },
    revoke: { from: ["active", "exhausted"], to: "revoked", emits: AllowanceRevoked,
              lands: { solidity: Lands.atInclusion,
                       noir: Lands.firstToLand({ worstCase: "what is left this month" }) } },
    reset:  { from: ["active", "exhausted"], to: "active", at: Time.eachBoundary("boundaries"),
              fires: { solidity: Fires.onNextTouch, noir: Fires.passive } },      // passive: no transaction, derived event
    expire: { from: ["active", "exhausted"], to: "expired", at: Time.lastBoundary("boundaries"),
              fires: { solidity: Fires.keeper, noir: Fires.passive } },
  },
})

// blueprint/things/allowance/verbs/spend.ts
export const spend = Blueprint.operation(Allowance, "spend", {
  payload: { allowance: AllowanceId, amount: Amount, recipient: Address },
  moves: machine.moves.spend,
  errors: [AllowanceExceeded, AllowanceUnfunded],
  allowed: [Roles.member],
  runs: { noir: Runs.private },
  steps: [Step.sync("allowance.spend.sync"), Step.simulate("allowance.spend.simulate"),
          Step.prove("allowance.spend.prove"), Step.wait("allowance.spend.inclusion")],
  footprint: { noir: Footprint.private({ publicCalls: 0, lifetime: "default, or the month's end", feePayer: "shared" }) },
  budget: { p95: "provisional until measured" },
})
```

The generator would refuse, at generation time: a time move marked `Fires.keeper` on a private Noir thing; a field
with a parties audience named in a public call; a revoke declared `Lands.atInclusion` on a private Noir thing (only a
public gate gives that); and `Lands.firstToLand` on a thing whose holders are not shared.

### 7.5 Telemetry and evals

- Spans are produced on the client. The server receives operation name, outcome tag, timings and step spans. It
  receives no amounts, addresses of pockets, note hashes, nullifiers or transaction hashes: a transaction hash next to
  an operation name and a caller would let the telemetry store tie private transactions to people, which is exactly
  what the chain hides. Correlate with a random id.
- "Explainable" changes meaning for a dropped transaction: the chain gives no reason. The client's classification, and
  the log that records it, are the explanation.
- The generic checks need two new members: the public footprint check (7.1), and "every field in telemetry has
  audience public".
- Budgets need a `prove` budget per operation, measured on the kind of device the caller has.

---

## 8. What a code spike must settle

In the order I would run them.

1. **The pocket end to end.** A keyed, never-deployed instance with `Map<_, SinglePrivateMutable<UintNote>>`; two
   wallets each registering it with its secret key; `additionalScopes`; in TXE and on the local network.
2. **Constrained delivery to the pocket's own address.** Does the handshake work for a recipient that is a keyed
   contract, do both wallets discover the note, and what does it add to proving time?
3. **Revoke.** Opening a never-used month dead; ending an opened one; the member's next spend fails; a spend built on
   an older anchor is dropped for a duplicate nullifier.
4. **The race.** Owner's revoke and member's spend sent together on the local network: exactly one lands; confirm the
   other is dropped and pays no fee.
5. **Time.** Does TXE enforce the expiration timestamp? If not, the upper edge of a month is a local-network test.
   Check the PXE's hour rounding near a boundary: a spend anchored within an hour of the edge, then within a second.
6. **Terms in the address.** `immutables_hash` checked in a private function; where the preimage lives (argument or
   capsule); thirteen boundaries packed into few fields.
7. **Money.** `transfer_in_private` from the pocket to a recipient; the owner sweeping the balance; a spend against an
   empty pocket and the refusal it gives.
8. **Proving time** of one spend on a laptop and in a browser, against the kernel figures.
9. **Fees.** Which fee contract exists on the network we target; what the payer tag shows; a sponsored path that
   cannot be drained.
10. **Refusals.** Can an assertion carry a typed value the client decodes, so `AllowanceExceeded { remaining }` reaches
    the member intact?
11. **How long the owner waits to see a spend** (note discovery after inclusion).
12. **Which line to target**: stay on 5.3, or move to 6.0 with its new repository, package scope and one-hour minimum
    delay.

Decisions that are not for a spike:

- **Funding policy** for pockets: how many months ahead, and who tops up. Aaron's call.
- **Whether the owner sees recipients.** A one-word change in an audience.
- **Whether the tombstone is on by default**, and its N.

---

## 9. Sources

All in `https://github.com/AztecProtocol/aztec-packages/blob/v5.3.0/` unless marked.

Library (`noir-projects/aztec-nr/aztec/src/`):

- `state_vars/mod.nr`, `owned.nr`, `owned_state_variable.nr`, `private_mutable.nr`, `private_set.nr`,
  `private_immutable.nr`, `single_private_mutable.nr`, `single_private_immutable.nr`, `single_use_claim.nr`,
  `public_mutable.nr`, `public_immutable.nr`, `delayed_public_mutable.nr`, `map.nr`
- `context/private_context.nr`, `context/public_context.nr`, `contract_self/contract_self_private.nr`
- `macros/notes.nr`, `note/note_interface.nr`, `note/utils.nr`, `note/note_message.nr`
- `history/nullifier.nr`, `history/note.nr`, `history/storage.nr`
- `public_checks.nr`, `messages/delivery/mod.nr`, `oracle/get_contract_instance.nr`
- `test/helpers/test_environment.nr`

Example contracts (`noir-projects/noir-contracts/contracts/`):

- `app/app_subscription_contract/src/main.nr`, `subscription_note.nr`, `dapp_payload.nr`
- `app/escrow_contract/src/main.nr`, `app/crowdfunding_contract/src/main.nr`, `app/claim_contract/src/main.nr`
- `app/token_contract/src/main.nr`, `app/private_token_contract/src/main.nr`
- `app/token_blacklist_contract/src/main.nr` and `src/types/transparent_note.nr`, `app/auth_contract/src/main.nr`
- `standard/public_checks_contract/src/main.nr`, `fees/sponsored_fpc_contract/src/main.nr`
- `account/schnorr_initializerless_account_contract/src/main.nr`

Protocol circuits (`noir-projects/noir-protocol-circuits/crates/`):

- `types/src/constants.nr` (`MAX_TX_LIFETIME`, per-call and per-transaction limits)
- `private-kernel-lib/src/components/tail_output_composer.nr`, `private_kernel_circuit_output_validator.nr`
- `rollup-lib/src/tx_base/components/private_tail_validator.nr`
- `rollup-lib/src/checkpoint_root/components/checkpoint_root_inputs_validator.nr`

Client (`yarn-project/`):

- `pxe/src/private_kernel/hints/compute_tx_expiration_timestamp.ts`
- `pxe/src/contract_function_simulator/oracle/utility_execution_oracle.ts`
- `txe/src/oracle/txe_oracle_top_level_context.ts`
- `aztec/src/testing/cheat_codes.ts`, `aztec.js/src/contract/interaction_options.ts`, `aztec.js/src/wallet/wallet.ts`

Docs in the tag (`docs/docs-developers/docs/`), served at `https://docs.aztec.network/developers/docs/...`:

- `aztec-nr/framework-description/state_variables.md`, `note_delivery.md`, `custom_notes.md`, `events_and_logs.md`,
  `calling_contracts.md`, `authentication_witnesses.md`, `immutables.md`
- `aztec-nr/framework-description/advanced/how_to_prove_history.md`, `partial_notes.md`,
  `writing_efficient_contracts.md`
- `aztec-nr/standards/escrow.md`, `aztec-nr/contract_readiness_states.md`, `aztec-nr/testing_contracts.md`
- `foundational-topics/advanced/authwit.md`, `foundational-topics/fees.md`, `foundational-topics/transactions.md`,
  `foundational-topics/accounts/keys.md`
- `aztec-js/how_to_use_private_fee_juice.md`
- `resources/migration_notes.md`, `resources/considerations/privacy_considerations.md`, `limitations.md`

Version 6.0.0, for comparison: `https://github.com/aztec-labs-eng/aztec-node/blob/v6.0.0/`:
`docs/docs-developers/docs/resources/migration_notes.md`,
`noir-projects/aztec-nr/aztec/src/state_vars/delayed_public_mutable.nr`.

Outside the repository: the Escrow standard, `https://github.com/defi-wonderland/aztec-standards` (the docs page
above quotes it; check that it is still maintained before depending on it).
