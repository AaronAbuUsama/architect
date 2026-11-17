I rebuilt the spike workspace from the handover and confirmed its checks still pass. Every in-scope item now has running code, and the stretch token transfer works too. The local network is stopped; there are no repos, commits, keys or cloud resources. The full report, with every source file appended, is also saved at `/tmp/spike-noir/REPORT.md` and `/tmp/claude-0/-home-user/2d039b8e-b4bf-5d2f-bd2c-a63d4a74b849/scratchpad/REPORT.md`.

# TO THE LEAD

## README

**Question.** Can design E2 (a role gate with a delayed revoke) carry the allowance on Aztec 5.3.0 privately? Specifically: can it carry the shared monthly limit, the year, and a revoke that bites after a fixed delay? And what does Architect need to declare to generate it?

**Answer.** Yes. Every in-scope point ran on code: in the TXE, on the local network, or both.
- The library sets the transaction's expiration bound itself, and the rollup enforces it.
- A spend proven before a revoke takes effect is rejected once the revoke is in force.
- A spend proven in one month cannot land in the next.
- Members spend from one shared pool without holding fee juice.
- Telemetry carried no private value.

Two things should change the declarations:
- **A short delay is visible.** With a 1-hour delay, every spend shows an expiration of anchor + 30 minutes. An ordinary transaction shows anchor + 23 hours.
- **Revoking membership does not revoke the pool key.** A revoked member can still read the pool.

**What was tried.**
- I rebuilt the handover's workspace with the same pinned versions and re-ran its checks. The TXE gave 5 unit and 22 conformance passes, and the planted test failed as intended. The full network `run.ts` passed every check.
- I wrote a new `RolePool` contract. Its generated layer is separate from the filled scaffold. Its TXE suite has 21 conformance tests, 3 platform probes and 1 planted test.
- I wrote a probe contract to find the smallest workable delay on the local network.
- I wrote a generated Effect client for the pool. Its runner uses an admin, two members and a stranger. Each person has their own device, and every account is fresh and was never funded.
- As a stretch, I made a real private Token transfer out of the pool.

**What was found** (numbered; the evidence is the run logs listed under Commands).

1. **The role gate works in private.**
   - Membership lives in `DelayedPublicMutable<u8, 3600>`, keyed by `marker = poseidon2(member, salt)`, and `spend` reads it privately.
   - A non-member is refused with `AllowanceNotMember`.
   - The admin holds the pool key but is not a member, and is refused too (network check E4.10).
2. **Add and revoke both take effect only after the delay.**
   - In the TXE, a spend 1 s before the add takes effect is refused. A spend 2 s before the revoke takes effect succeeds. A spend after the revoke's delay is refused.
   - On the network, m1 was refused before the add took effect (E3.2). Right after the revoke, m1 still spent (E5.1). After the delay, m1 was refused (E5.5), while m2 still spent (E5.6).
3. **The library sets the expiration bound itself, and the rollup enforces it.**
   - Ten minutes before the revoke took effect, m1 and m2 each proved a spend from the same anchor.
   - m1's proof expired at exactly the change time minus 1 s (anchor + 647 s). m2's proof expired at anchor + 1800 s.
   - After the clock moved past the change, m1's transaction was rejected with `NetworkRejected "Invalid expiration timestamp"`. m2's transaction was mined (E5.2–E5.4b).
4. **Aztec-nr 5.3.0 has no minimum delay. The practical minimum on the local network is 61–120 s.**
   - With a 1 s delay, the PXE refuses to prove ("Include-by timestamp must be greater than the anchor block timestamp").
   - With delays of 12, 24, 36 and 60 s, the node drops the transaction, because blocks land 72 s after the anchor.
   - Delays of 120 s and more are mined (probe-delay.log).
5. **The PXE's rounding decides what the public sees of the expiration.**
   - The bound is `anchor + D − 1`. The PXE rounds it down to whole hours, then to 30 minutes, then to seconds, whichever stays after the anchor.
   - A transaction that reads no delayed value gets anchor + 82,800 s (23 h). The contract-update horizon caps every private transaction at 24 h, and the rounding then takes off an hour.
   - Measured: D = 600 s → +599 s; 1,800 s → +1,799 s; 3,600 s → +1,800 s; 5,400 s → +3,600 s; 86,400 s → +82,800 s, the same as the control.
6. **The TXE does not enforce a transaction's expiration timestamp.**
   - Three probes landed transactions past their bound: past the membership horizon, after a revoke took effect, and across a month end. All three were accepted.
   - The month-end transaction debited January's slot in February.
7. **The month as a slot and the year as a guard work.**
   - In the TXE, a new month is an empty slot. Month 11 still spends. Month 12 is refused with `AllowanceCannotSpend { state: 3 }`.
   - On the network, m2 proved a spend at 30 Nov 23:29:22 and submitted it after midnight. It was rejected with `Invalid expiration timestamp` (E7.3).
   - The next spend landed in month 1 with `spent` reset (E7.4).
8. **Custody: the pool is the contract's own keyed address.**
   - The contract is deployed with `publicKeys` derived from a fresh secret.
   - The admin and each member register it with `registerContract(instance, artifact, secret)`. Every call carries the pool in scope.
   - Both members and the admin see the same pool state (limit 250,000, spent 3,040).
   - The stranger knows the contract but not the key. It can neither read the pool nor spend from it: both come back as `AztecFailure`, at read and at prove.
   - **What each member sees of the others:** all spend amounts and the remaining balance, through `AllowanceSpent` events, but not who spent. `MemberSpent`, which carries the member's address, reaches the admin only; m2 sees none of these events (E4.4–E4.6).
   - Members hold the salt, so they can check whether any address they guess is a member (E3.5).
9. **Fees.**
   - All five accounts were created fresh and never funded.
   - Every transaction, including both deploys, was paid with `new SponsoredFeePaymentMethod(sponsor)`. The sponsor's address comes from the `SponsoredFPC` artifact and `SPONSORED_FPC_SALT`, and it matched the address the network logged.
   - The gossiped transaction shows the sponsor as fee payer. The only public data write of a spend is the sponsor's fee balance.
10. **What the public sees.**
    - **Of a spend:**
      - the transaction hash, the anchor block and the expiration (anchor + 30 minutes with a 1-hour delay);
      - the fee payer (the shared sponsor) and the fee;
      - 1 note hash, 4 nullifiers, 3 private logs and 1 public data write, with no public log and no public call.
      - The pool address, the members, the admin and the marker appear nowhere in the effects.
    - **Of a revoke:**
      - 2 nullifiers, 1 private log, and 5 public data writes (the delayed state and the fee).
      - Its enqueued public call reveals the contract, the function and the marker, by design of the protocol. I did not inspect the gossiped call data.
      - Anyone can then read the marker's current value, scheduled value and change time (E3.1, E5).
11. **Linking leak while a change is pending.**
    - In the 30 minutes before a member's own add or revoke takes effect, that member's spends carry an expiration of the change time minus 1 s, to the second (finding 3).
    - That matches the publicly scheduled change, so it links the spend to that pool and that marker.
    - Outside that window, the rounding hid the change (E5.1 showed +1800 s).
12. **Refusals come back typed.**
    - Private refusals are decoded from the prove error: `AllowanceNotMember`, `AllowanceNotAdmin` and `AllowanceExceeded { remaining }`.
    - The membership machine is enforced in public. Its refusals (`MembershipCannotAdd { 1 }`, `MembershipCannotRevoke { 2 }`) come back typed only because the client runs a `check` step that simulates the public part before proving.
    - A second grant cannot be refused privately. It surfaces as `NetworkRejected "Existing nullifier"`.
    - "Not granted yet" and "no key" surface as `AztecFailure`.
13. **Telemetry.**
    - The client recorded 146 spans and tracked 31 private values; none of them appeared in a span.
    - No address appeared in exported attributes, and neither the pool address nor the pool key appears in any span.
    - The Aztec library logged 421 lines at `info`, with no private value in them.
14. **Moving the clock: a fix for the handover's warning.**
    - After many stepped warps, even an existing wallet fails with "Highest aged index (19) must not exceed highest finalized index (9)".
    - The cause: L2 finality follows L1, and the warps outran it.
    - Mining 130 L1 blocks after each warp step lets finality catch up. With that, 17 steps (to the month end and past it) ran cleanly.
15. **Stretch: a real private transfer out of the pool.**
    - The admin minted 1,000,000 tokens privately to the pool.
    - m1 called `spend_to(token, recipient, 4321)`. Inside it, the pool contract calls `Token.transfer_in_private(from = pool, …)` as itself, with nonce 0 and no authwit.
    - The recipient's device sees 4,321. The admin and m1 both see the pool at 995,679, and the allowance shows `spent` 4,321.
    - Going over the allowance came back as `AllowanceExceeded { remaining: 5679 }`.
    - Publicly: 5 note hashes, 9 nullifiers, 9 private logs and 1 public data write, with no address visible.

**Measurements** (4 vCPU, no GPU, client-side proving, local network).

| Operation (network) | Runs | Proving only, median / worst | Prove step (execution and proving), median / worst | Total per operation, median / worst |
|---|---|---|---|---|
| spend (E2) | 9 | 6,388 / 6,703 ms | 7,570 / 8,069 ms | 10,286 / 10,814 ms |
| spendTo, with a Token transfer | 1 | 11,398 ms | 13,759 ms | 16,442 ms |
| grant / addMember | 1 / 2 | — | 7,997 / 7,737–7,985 ms | — |

- **Gates (app circuit only):**
  - spend 12,559; spend_to 12,646, not counting the token's circuit;
  - grant 7,952; add_member and revoke_member 5,826 each;
  - the probe's private read of a delayed value is 7,447, against 5,441 for a no-op.
- Deploying the pool took 14.7 s.
- The handover baseline re-ran within its earlier numbers: grant prove step 10,246 ms median, spend total about 12 s.

**The decision it supports.** E2 can go forward as the Noir target's private design, with two changes to the declarations:
- **Prefer `revoke: { takesEffect: "after 24 hours" }`.** Spends are then indistinguishable from any other transaction by their lifetime. Use 1 hour only if a faster revoke is worth a visible 30-minute lifetime on every spend.
- **Declare that a revoke removes the right to spend, not the right to read.**

**Open risks.**
- **Readable after revoke.** A revoked member keeps the pool key and can still read every future pool note and event. Only a new pool with a new key ends that; key rotation was not tested.
- **Same-month races.** Two members spending in the same month race on one month note. The loser is rejected with an existing nullifier and must re-prove. The handover showed this rejection for one note; it was not re-tested for two members.
- **Fee payer.** The sponsored fee contract is a test-network convenience. A production fee payer for members was not tested.
- **No proof verification.** The local network does not verify proofs.
- **Instant flavour not built.** In E1, a public membership check is enqueued from private. By design, it would reveal the contract and the marker on every spend.
- **Version 6.** Its one-hour minimum delay was not tested.
- **Compiler noise.** The compiler prints "bug:" lints from aztec-nr's `get_note`. The earlier contract had them too (42).

## Primitives

| Primitive | Status | Evidence | Proposed declaration shape |
|---|---|---|---|
| Role membership in delayed public state, keyed by a salted marker | **validated** | TXE, plus network E3–E5 | `roles.member.membership: { storage: "delayed-public", key: "salted" }` |
| Delayed revoke (add is delayed too) | **validated, refined** | TXE; network E5.1–E5.6; the add was delayed (E3.2) | `revoke: { takesEffect: "after 24 hours" }`, applied to every membership move |
| The library sets the expiration bound itself | **validated** | E5.2–E5.4b: bound = change − 1 s; rejected; control mined | implied by `storage: "delayed-public"`; no code |
| Minimum delay on 5.3.0 | **validated** | none in aztec-nr; the PXE refuses 1 s; the local network needs more than 60 s (120 s works) | the generator rejects a `takesEffect` below one block time plus proving; version 6 forces at least 1 h |
| Privacy of the expiration (rounding) | **validated** | probe table: 1 h → +30 min; 24 h → +23 h, the same as a plain transaction | warn when `takesEffect` is under 23 h + 1 s |
| Time rule: reset by slot, expire by guard, anchor = "has passed", expiration = "has not passed" | **validated** | TXE time tests; network E7.3–E7.4 | `reset: { every: "calendar_month", by: "slot" }`, `expire: { after: "12 months", by: "guard" }` |
| The TXE enforces a transaction's expiration | **refuted** (it does not) | 3 probes | the generator emits a `network` test kind for expiration |
| Pool custody: a keyed contract, with the key shared by the admin and members | **validated** | E1, E2.1, E4.3, E4.9; stretch T2–T4 | `custody: { holder: "pool", key: "shared(admin, member)" }` |
| `visibility: "private(pool)"` and `"private(admin)"` | **validated** | E4.4–E4.7 | as written |
| Sponsored fees for members | **validated** | E0, E6.3, all transactions | `fees: { payer: "sponsored" }` |
| `runs: "client"`, the `prove` step kind, and a `check` step for public machines | **validated** | spans (E9.3); typed public refusals (E3.3, E5.7) | steps: `request, sync, check?, prove, submit, wait` |
| Typed refusals | **validated, refined** | private ones decoded from the prove error; public ones through `check`; a second grant only as `NetworkRejected` | `refusals` in both private and public code; a "does not exist" check has no private refusal |
| No private value in telemetry | **validated** | 146 spans, no private value found; library logs at `info`, none found | the span-attribute allowlist, as before |
| A real private token transfer out of the pool | **validated** (stretch) | T3–T6 | `spend: { moves: token }` |
| The instant flavour (E1) | **not tested** | — | — |
| Rotating the pool key after a revoke | **not tested** | — | — |
| Version 6 behaviour | **not tested** | — | — |

## Addendum for Architect's lead

**Validated.** Design E2 runs on Aztec 5.3.0 and keeps a spend private.
- **The gate.**
  - Role membership lives in delayed public state, keyed by a hash of the member and a pool secret.
  - A spend reads that state inside the private proof. The library then caps the transaction's lifetime at the earliest moment the membership could change, and the rollup refuses the transaction after that.
  - So a revoke bites at its scheduled time, even for a spend proven before it. Adding a member is delayed the same way.
- **The pool.**
  - The pool's private state is owned by the contract's own address.
  - The admin and the members all hold its key, and only members pass the gate.
  - Members see the pool's amounts but not who spent; only the admin sees that.
- **Fees and the public view.**
  - Every party paid fees through the sponsored fee contract without holding fee juice.
  - Of a spend, the public sees the sponsor as fee payer, a fee, the counts of notes, nullifiers and logs, and a lifetime.
  - It sees no address, no amount and no pool.
- **The time rule for Noir holds.**
  - A time move over private state is a guard on the next operation, never a transaction.
  - It may rely on instants fixed at creation, on the anchor timestamp to show a moment has passed, on the expiration bound to show a moment has not passed, and on nullifier uniqueness.
  - A monthly reset is a new slot per month. Expiry is a guard on the month index.
- **Tests and client.**
  - The TXE does not enforce expiration, so these guarantees need a test kind that runs on the local network.
  - The client exposes each operation as one span with `request`, `sync`, an optional `check`, `prove`, `submit` and `wait` steps.
  - Private refusals come back typed; public ones come back typed through the `check` step.
  - A spend's proving step took 7.6 s median and 8.1 s worst.

**Choices for the lead.** The revoke delay sets what the public sees.
- With a 1-hour delay, every spend shows a 30-minute lifetime, while an ordinary transaction shows 23 hours.
- In the 30 minutes before a member's own scheduled change, that member's spends show the exact change time, which links them to the pool.
- A delay of 24 hours removes both signals.
- The practical floor on the local network was about two minutes; version 6 imposes one hour.

**Not validated (kept apart).**
- Revoking a member does not take back the pool key; rotating the key was not tested.
- Two members racing in one month was not re-tested.
- A production fee payer, the instant flavour (E1) and version 6 were not tested.
- The local network does not verify proofs.

**Clock controls.** The world clock controller can drive the local network with `EthCheatCodes.warp(t)`. Each step must be under 23 hours and followed by one block. Then about 130 mined L1 blocks let finality catch up.

## Pinned versions

Same as the handover:
- Aztec toolchain 5.3.0, aztec-nr `v5.3.0`
- nargo 1.0.0-beta.25, Foundry 1.4.1, Node 24.12.0
- client: `effect@4.1.2` and `@aztec/*@5.3.0`

New in this session:
- `@aztec/noir-contracts.js@5.3.0`, which provides `SponsoredFPC` and `Token`.
- `@aztec/constants@5.3.0` and `@aztec/ethereum@5.3.0` come in transitively.
- Installed resolution: typescript 7.0.2, tsx 4.23.15.

## Commands

```bash
# install: as in the handover, plus @aztec/noir-contracts.js@5.3.0 in the client
cd /tmp/spike-noir/client && npm install effect@4.1.2 @aztec/aztec.js@5.3.0 @aztec/accounts@5.3.0 @aztec/wallets@5.3.0 @aztec/stdlib@5.3.0 @aztec/foundation@5.3.0 @aztec/pxe@5.3.0 @aztec/wallet-sdk@5.3.0 @aztec/noir-contracts.js@5.3.0 typescript tsx
. /tmp/spike-noir/env.sh
cd /tmp/spike-noir/allowance
aztec compile                                         # all three contracts
aztec test --package allowance_test                    # handover suite: 22 pass, planted fails
aztec test --package role_pool_test                    # E2: 24 pass (21 conformance + 3 probes), planted fails (exit 1 intended)
aztec test --package role_pool_contract                # generated unit tests (machine, calendar)
aztec profile gates target
aztec codegen target -o ../client/src/artifacts
# local network: fresh before each runner
P=$(pgrep -f "index.js start --local-network"); [ -n "$P" ] && kill $P; sleep 3; pkill -f anvil
cd /tmp/spike-noir && (nohup aztec start --local-network > localnet.log 2>&1 &); until grep -q "Aztec Server listening" localnet.log; do sleep 3; done
cd client && npx tsc -p .
LOG_LEVEL=warn npx tsx src/probe-delay.ts > probe-delay.log 2>&1                          # about 20 min
ARCHITECT_DEVICE_DEBUG=1 LOG_LEVEL=info npx tsx src/run-token.ts > run-token.log 2>&1      # about 5 min (stretch)
ARCHITECT_DEVICE_DEBUG=1 LOG_LEVEL=info npx tsx src/run-e2.ts > run-e2.log 2>&1; grep CHECK run-e2.log   # about 30 min
```

Logs on disk under `/tmp/spike-noir`:
- `client/run-baseline.log`: the handover's checks, re-run.
- `client/probe-delay.log`: the minimum-delay probe.
- `client/run-e2.log`: the passing E2 run. `run-e2-attempt1.log` and `run-e2-attempt2.log` are the earlier runs.
- `client/run-token.log`: the stretch token transfer.
- `client/spans-e2.json`: the recorded spans.
- `rp-test2.log`: the role-pool TXE suite.
- `final-test-all.log`: the handover's TXE suite.

Removed: the handover's `diag4.ts` was not recreated, because it is produced by the `sed` command listed in the handover.

## Complete source of every file written or changed

`/tmp/spike-noir/allowance/Nargo.toml` (changed)
```toml
[workspace]
members = ["allowance_contract", "allowance_test", "role_pool_contract", "role_pool_test", "delay_probe_contract"]
```

`/tmp/spike-noir/allowance/role_pool_contract/Nargo.toml`
```toml
[package]
name = "role_pool_contract"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-nr", tag="v5.3.0", directory="aztec" }
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/mod.nr`
```rust
// Generated from the blueprint. Do not edit.
// Thing: allowance, design E2 (role gate with a delayed revoke). Target: noir (aztec-nr v5.3.0).
pub mod types;
pub mod errors;
pub mod machine;
pub mod calendar;
pub mod notes;
// events and the membership delay: injected into the contract module (see main.nr); the ABI only lists events
// declared there.
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/types.nr`
```rust
// Generated from the blueprint. Do not edit.
// Two machines: the shared `allowance` (one per pool) and `membership` (one per member of the role).

// ---- allowance states. 0 = none: the pool has not been granted yet. ----
pub global STATE_NONE: u8 = 0;
pub global STATE_ACTIVE: u8 = 1;
pub global STATE_EXHAUSTED: u8 = 2; // for the current month
pub global STATE_EXPIRED: u8 = 3; // the year is over

// ---- allowance moves. reset and expire are TIME moves: never a transaction, a guard on the next spend. ----
pub global MOVE_GRANT: u8 = 1;
pub global MOVE_SPEND: u8 = 2;
pub global MOVE_RESET: u8 = 4; // every: calendar_month   -> by construction (one slot per month)
pub global MOVE_EXPIRE: u8 = 5; // after: 12 months        -> guard (month index >= 12 refuses)

// ---- membership states (stored in delayed public state, keyed by a salted marker, never by address) ----
pub global MEMBER_NONE: u8 = 0;
pub global MEMBER_ACTIVE: u8 = 1;
pub global MEMBER_REVOKED: u8 = 2;

// ---- membership moves ----
pub global MOVE_ADD_MEMBER: u8 = 10;
pub global MOVE_REVOKE_MEMBER: u8 = 11;

// ---- roles ----
pub global ROLE_ADMIN: u8 = 1;
pub global ROLE_MEMBER: u8 = 2;

// ---- the year ----
pub global YEAR_MONTHS: u32 = 12;

// Field visibility, as declared in the blueprint:
//   limit, spent (per month), start_month, salt : private(pool)  -> every key holder of the pool (admin + members)
//   member identity of a spend                  : private(admin)
//   membership state                            : delayed-public, keyed by H(member, salt): public value, hidden key
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/errors.nr`
```rust
// Generated from the blueprint. Do not edit.
// Refusals: assertion messages `[CODE] Name { field: value }`, decoded by the client into typed errors.
// A refusal raised in a PRIVATE function is only ever seen by the caller's device. A refusal raised in a PUBLIC
// function (membership moves) is seen by the sequencer and anyone simulating; its payload is public state anyway.

pub fn refuse_move(mv: u8, state: u8) {
    if mv == crate::generated::types::MOVE_GRANT {
        panic(f"[AL-001] AllowanceCannotGrant {{ state: {state} }}")
    } else if mv == crate::generated::types::MOVE_SPEND {
        panic(f"[AL-002] AllowanceCannotSpend {{ state: {state} }}")
    } else if mv == crate::generated::types::MOVE_ADD_MEMBER {
        panic(f"[AL-030] MembershipCannotAdd {{ state: {state} }}")
    } else if mv == crate::generated::types::MOVE_REVOKE_MEMBER {
        panic(f"[AL-031] MembershipCannotRevoke {{ state: {state} }}")
    } else {
        panic(f"[AL-099] AllowanceUndeclaredMove {{ move: {mv}, state: {state} }}")
    }
}

pub fn assert_within(amount: u128, remaining: u128) {
    assert(amount <= remaining, f"[AL-010] AllowanceExceeded {{ remaining: {remaining} }}");
}

pub fn assert_admin(caller_is_admin: bool) {
    assert(caller_is_admin, "[AL-020] AllowanceNotAdmin {}");
}

pub fn assert_member(caller_is_member: bool) {
    assert(caller_is_member, "[AL-021] AllowanceNotMember {}");
}
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/machine.nr`
```rust
// Generated from the blueprint. Do not edit.
//
//   allowance:
//     grant  : none              -> active
//     spend  : active            -> active | exhausted
//     reset  : exhausted|active  -> active      (time: a new month is a new slot; by construction, no code path)
//     expire : active|exhausted  -> expired     (time: guard on spend, month index >= 12)
//   membership (delayed: every move takes effect after MEMBERSHIP_DELAY):
//     add    : none   -> member
//     revoke : member -> revoked
use crate::generated::types::{
    MEMBER_ACTIVE, MEMBER_NONE, MEMBER_REVOKED, MOVE_ADD_MEMBER, MOVE_EXPIRE, MOVE_GRANT, MOVE_RESET,
    MOVE_REVOKE_MEMBER, MOVE_SPEND, STATE_ACTIVE, STATE_EXHAUSTED, STATE_EXPIRED, STATE_NONE, YEAR_MONTHS,
};
use crate::generated::errors;

pub fn can(from: u8, mv: u8) -> bool {
    if mv == MOVE_GRANT {
        from == STATE_NONE
    } else if mv == MOVE_SPEND {
        from == STATE_ACTIVE
    } else if (mv == MOVE_RESET) | (mv == MOVE_EXPIRE) {
        (from == STATE_ACTIVE) | (from == STATE_EXHAUSTED)
    } else if mv == MOVE_ADD_MEMBER {
        from == MEMBER_NONE
    } else if mv == MOVE_REVOKE_MEMBER {
        from == MEMBER_ACTIVE
    } else {
        false
    }
}

pub fn is_edge(from: u8, mv: u8, to: u8) -> bool {
    if mv == MOVE_GRANT {
        (from == STATE_NONE) & (to == STATE_ACTIVE)
    } else if mv == MOVE_SPEND {
        (from == STATE_ACTIVE) & ((to == STATE_ACTIVE) | (to == STATE_EXHAUSTED))
    } else if mv == MOVE_RESET {
        can(from, mv) & (to == STATE_ACTIVE)
    } else if mv == MOVE_EXPIRE {
        can(from, mv) & (to == STATE_EXPIRED)
    } else if mv == MOVE_ADD_MEMBER {
        (from == MEMBER_NONE) & (to == MEMBER_ACTIVE)
    } else if mv == MOVE_REVOKE_MEMBER {
        (from == MEMBER_ACTIVE) & (to == MEMBER_REVOKED)
    } else {
        false
    }
}

pub fn step(from: u8, mv: u8, to: u8) -> u8 {
    if !can(from, mv) {
        errors::refuse_move(mv, from);
    }
    assert(is_edge(from, mv, to), f"[AL-099] AllowanceUndeclaredTarget {{ move: {mv}, state: {from}, to: {to} }}");
    to
}

/// The allowance state as seen by a spend: derived from the slot of the month the anchor time falls in.
/// `month` is relative to the grant (0 = the month of the grant). No stored state field: time moves are derived.
pub fn state_at(granted: bool, month: u32, spent: u128, limit: u128) -> u8 {
    if !granted {
        STATE_NONE
    } else if month >= YEAR_MONTHS {
        STATE_EXPIRED
    } else if spent >= limit {
        STATE_EXHAUSTED
    } else {
        STATE_ACTIVE
    }
}

mod test {
    use crate::generated::types::{
        MEMBER_ACTIVE, MEMBER_NONE, MEMBER_REVOKED, MOVE_ADD_MEMBER, MOVE_REVOKE_MEMBER, MOVE_SPEND, STATE_ACTIVE,
        STATE_EXHAUSTED, STATE_EXPIRED, STATE_NONE,
    };
    use super::{state_at, step};

    #[test]
    fn declared_edges() {
        assert_eq(step(STATE_ACTIVE, MOVE_SPEND, STATE_EXHAUSTED), STATE_EXHAUSTED);
        assert_eq(step(MEMBER_NONE, MOVE_ADD_MEMBER, MEMBER_ACTIVE), MEMBER_ACTIVE);
        assert_eq(step(MEMBER_ACTIVE, MOVE_REVOKE_MEMBER, MEMBER_REVOKED), MEMBER_REVOKED);
    }

    #[test(should_fail_with = "[AL-031] MembershipCannotRevoke { state: 2 }")]
    fn revoke_twice() {
        let _ = step(MEMBER_REVOKED, MOVE_REVOKE_MEMBER, MEMBER_REVOKED);
    }

    #[test(should_fail_with = "[AL-030] MembershipCannotAdd { state: 2 }")]
    fn re_add_revoked() {
        let _ = step(MEMBER_REVOKED, MOVE_ADD_MEMBER, MEMBER_ACTIVE);
    }

    #[test]
    fn derived_states() {
        assert_eq(state_at(false, 0, 0, 10), STATE_NONE);
        assert_eq(state_at(true, 0, 3, 10), STATE_ACTIVE);
        assert_eq(state_at(true, 11, 10, 10), STATE_EXHAUSTED);
        assert_eq(state_at(true, 12, 0, 10), STATE_EXPIRED);
    }
}
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/calendar.nr`
```rust
// Generated from the blueprint. Do not edit.
// `every: calendar_month`, UTC. month index = year * 12 + month - 1.

/// Month index of a unix timestamp (civil_from_days, H. Hinnant; unsigned, timestamps >= 1970).
pub fn month_index(timestamp: u64) -> u32 {
    let days = timestamp / 86400;
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + (if m <= 2 { 1 } else { 0 });
    (y * 12 + m - 1) as u32
}

/// Unix timestamp of the first second of month `index` (days_from_civil, H. Hinnant).
pub fn month_start(index: u32) -> u64 {
    let y0 = (index / 12) as u64;
    let m = (index % 12) as u64 + 1;
    let y = if m <= 2 { y0 - 1 } else { y0 };
    let era = y / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    (era * 146097 + doe - 719468) * 86400
}

mod test {
    use super::{month_index, month_start};
    #[test]
    fn months() {
        assert_eq(month_index(1794787200), 2026 * 12 + 10); // 2026-11-16
        assert_eq(month_index(1796083199), 2026 * 12 + 10); // 2026-11-30T23:59:59Z
        assert_eq(month_index(1796083200), 2026 * 12 + 11); // 2026-12-01
        assert_eq(month_index(1835438400), 2028 * 12 + 1); // 2028-02-29T12:00Z
    }
    #[test]
    fn starts() {
        assert_eq(month_start(2026 * 12 + 11), 1796083200); // 2026-12-01
        assert_eq(month_start(2027 * 12), 1798761600); // 2027-01-01
        assert_eq(month_start(2028 * 12 + 2), 1835481600); // 2028-03-01
        for i in 0..40 {
            let idx = 2026 * 12 + i;
            assert_eq(month_index(month_start(idx)), idx);
            assert_eq(month_index(month_start(idx) - 1), idx - 1);
        }
    }
}
```

`/tmp/spike-noir/allowance/role_pool_contract/src/generated/notes.nr`
```rust
// Generated from the blueprint. Do not edit.
// Private state of the pool. Both notes are OWNED BY THE POOL ADDRESS (the contract's own keyed address), so the
// default aztec-nr nullifier (keyed by the pool's nullifier hiding key) is computable by every holder of the pool's
// secret key: the admin and the members. Nobody else can read or move them.
use aztec::{macros::notes::note, protocol::{address::AztecAddress, traits::Packable}};

#[derive(Eq, Packable)]
#[note]
pub struct PoolConfigNote {
    pub admin: AztecAddress,
    pub limit: u128,
    pub start_month: u32,
    pub salt: Field, // keys the membership markers: marker = H(member, salt)
}

#[derive(Eq, Packable)]
#[note]
pub struct MonthNote {
    pub spent: u128,
}
```

`/tmp/spike-noir/allowance/role_pool_contract/src/main.nr`
```rust
// Scaffold generated from the blueprint (design E2: a role gate with a delayed revoke); the blanks marked FILLED
// were filled by hand in this spike.
//
// The pool is this contract's own address. It is deployed with a secret key, which the admin hands to every member:
// pool-owned notes (the config and one slot per month) can then be read and nullified by every key holder, and only
// through this contract's functions. Membership lives in DelayedPublicMutable state keyed by H(member, salt) and is
// read privately by `spend`, so a spend reveals nothing about the pool, the member or the amount.
pub mod generated;

use aztec::macros::aztec;

#[aztec]
pub contract RolePool {
    use crate::generated::{
        calendar::{month_index, month_start},
        errors,
        machine,
        notes::{MonthNote, PoolConfigNote},
        types::{
            MEMBER_ACTIVE, MEMBER_REVOKED, MOVE_ADD_MEMBER, MOVE_REVOKE_MEMBER, MOVE_SPEND, STATE_ACTIVE,
            STATE_EXHAUSTED, STATE_EXPIRED, STATE_NONE, YEAR_MONTHS,
        },
    };
    use aztec::{
        macros::{events::event, functions::{external, internal, only_self, view}, storage::storage},
        messages::delivery::MessageDelivery,
        oracle::random::random,
        protocol::{abis::function_selector::FunctionSelector, address::AztecAddress, hash::poseidon2_hash, traits::ToField},
        state_vars::{DelayedPublicMutable, Map, Owned, PrivateImmutable, PrivateMutable},
    };

    // ---- generated: from `revoke: { takesEffect: "after 1 hour" }` (applies to every membership move) ----
    pub global MEMBERSHIP_DELAY: u64 = 3600;

    // ---- generated: events (must live inside the contract module to reach the ABI). Do not edit. ----
    // visibility: private(pool) -> every key holder; private(admin) -> the admin only. Never public.
    #[event]
    struct AllowanceGranted { limit: u128, start_month: u32 }
    #[event]
    struct AllowanceSpent { amount: u128, remaining: u128, month: u32 } // to the pool: no spender identity
    #[event]
    struct MemberSpent { member: AztecAddress, amount: u128, month: u32 } // to the admin only
    #[event]
    struct MembershipScheduled { member: AztecAddress, state: u8 } // to the admin only
    // ---- end generated: events ----

    #[storage]
    struct Storage<Context> {
        // generated: private(pool) state, owned by the pool address
        config: Owned<PrivateImmutable<PoolConfigNote, Context>, Context>,
        // generated: `every: calendar_month` for `after: 12 months` -> twelve slots keyed by the month since grant
        months: Map<Field, Owned<PrivateMutable<MonthNote, Context>, Context>, Context>,
        // generated: role membership in delayed public state, keyed by marker = H(member, salt)
        members: Map<Field, DelayedPublicMutable<u8, MEMBERSHIP_DELAY, Context>, Context>,
    }

    // generated: the one time private code can trust (anchor block timestamp: a LOWER bound on real time)
    #[contract_library_method]
    fn trusted_now(context: &mut aztec::context::PrivateContext) -> u64 {
        context.get_anchor_block_header().global_variables.timestamp
    }

    // generated: delivery for pool-visible and admin-visible messages. The tag is derived from the pool as sender
    // (every key holder can scan for it) with an address-derived secret (no handshake, no on-chain trace).
    #[contract_library_method]
    fn quiet(pool: AztecAddress) -> aztec::messages::delivery::OnchainUnconstrainedDelivery {
        MessageDelivery::onchain_unconstrained().with_sender(pool).via_address_derived_secret()
    }

    #[contract_library_method]
    fn marker_of(member: AztecAddress, salt: Field) -> Field {
        poseidon2_hash([member.to_field(), salt])
    }

    // ---- operation: grant (role: admin, runs: client, private) ----
    // none -> active, constrained by the PrivateImmutable initialization nullifier (a second grant is rejected
    // by the network as an existing nullifier).
    #[external("private")]
    fn grant(limit: u128) {
        let admin = self.msg_sender();
        let pool = self.address;
        // FILLED
        // Safety: the salt only has to be unpredictable to outsiders; the admin picks it.
        let salt = unsafe { random() };
        let start_month = month_index(trusted_now(self.context));
        let _ = machine::step(STATE_NONE, crate::generated::types::MOVE_GRANT, STATE_ACTIVE);
        self.storage.config.at(pool).initialize(PoolConfigNote { admin, limit, start_month, salt }).deliver_to(
            pool,
            quiet(pool),
        );
        self.emit(AllowanceGranted { limit, start_month }).deliver_to(pool, quiet(pool));
    }

    // ---- operation: addMember / revokeMember (role: admin, runs: client, private + enqueued public) ----
    // The admin check is private (against the pool's config note); the move itself is a scheduled change of public
    // state: what becomes public is the marker, the new state and when it takes effect, never the member's address.
    #[external("private")]
    fn add_member(member: AztecAddress) {
        let config = self.storage.config.at(self.address).get_note();
        errors::assert_admin(config.admin == self.msg_sender());
        self.enqueue_self._move_membership(marker_of(member, config.salt), MOVE_ADD_MEMBER, MEMBER_ACTIVE);
        self.emit(MembershipScheduled { member, state: MEMBER_ACTIVE }).deliver_to(config.admin, quiet(self.address));
    }

    #[external("private")]
    fn revoke_member(member: AztecAddress) {
        let config = self.storage.config.at(self.address).get_note();
        errors::assert_admin(config.admin == self.msg_sender());
        self.enqueue_self._move_membership(marker_of(member, config.salt), MOVE_REVOKE_MEMBER, MEMBER_REVOKED);
        self.emit(MembershipScheduled { member, state: MEMBER_REVOKED }).deliver_to(config.admin, quiet(self.address));
    }

    // generated: the membership machine, enforced in public against the LATEST scheduled value (a move scheduled
    // but not yet in effect still counts, so revoke-then-revoke is refused immediately).
    #[external("public")]
    #[only_self]
    fn _move_membership(marker: Field, mv: u8, to: u8) {
        let (latest, _) = self.storage.members.at(marker).get_scheduled_value();
        let _ = machine::step(latest, mv, to);
        self.storage.members.at(marker).schedule_value_change(to);
    }

    // ---- operation: spend (role: member, runs: client, private) ----
    // A ledger spend: debits the shared allowance; the value moves elsewhere (or not at all).
    #[external("private")]
    fn spend(amount: u128) -> u128 {
        self.internal._debit(self.msg_sender(), amount)
    }

    // ---- operation: spendTo (role: member, runs: client, private) [stretch] ----
    // A real private transfer out of the pool: the pool contract moves token notes OWNED BY ITS OWN ADDRESS, so
    // from == msg_sender inside the token and no authwit is needed. The member's device nullifies the pool's notes
    // with the pool's key (in scope). Recipient and amount stay private.
    #[external("private")]
    fn spend_to(token: AztecAddress, to: AztecAddress, amount: u128) -> u128 {
        let remaining = self.internal._debit(self.msg_sender(), amount);
        let pool = self.address;
        let selector = FunctionSelector::from_signature("transfer_in_private((Field),(Field),u128,Field)");
        let _ = self.context.call_private_function(token, selector, [pool.to_field(), to.to_field(), amount as Field, 0]);
        remaining
    }

    // generated: the guard chain of `spend` (role gate, time moves, data refusal), shared by every spend flavour
    #[internal("private")]
    fn _debit(member: AztecAddress, amount: u128) -> u128 {
        let pool = self.address;
        let config = self.storage.config.at(pool).get_note();

        // generated: role gate. A private read of delayed public state; the library itself bounds the tx's
        // expiration to the earliest moment the membership could change.
        let status = self.storage.members.at(marker_of(member, config.salt)).get_current_value();
        errors::assert_member(status == MEMBER_ACTIVE);

        // generated: time moves as guards on this operation (see the time rule).
        let mi = month_index(trusted_now(self.context)); // the month HAS started: anchor time >= month start
        let month = mi - config.start_month;
        if month >= YEAR_MONTHS {
            errors::refuse_move(MOVE_SPEND, STATE_EXPIRED); // expire: after 12 months
        }
        // the month has NOT ended: the rollup refuses the tx after the last second of this month.
        self.context.set_expiration_timestamp(month_start(mi + 1) - 1);

        // FILLED: debit this month's slot (reset by construction: a new month is an empty slot).
        let limit = config.limit;
        let new_note = self.storage.months.at(month as Field).at(pool).initialize_or_replace(|prev: Option<MonthNote>| {
            let spent = if prev.is_some() { prev.unwrap_unchecked().spent } else { 0 };
            let state = machine::state_at(true, month, spent, limit);
            if !machine::can(state, MOVE_SPEND) {
                errors::refuse_move(MOVE_SPEND, state);
            }
            errors::assert_within(amount, limit - spent);
            let to = if spent + amount == limit { STATE_EXHAUSTED } else { STATE_ACTIVE };
            let _ = machine::step(state, MOVE_SPEND, to);
            MonthNote { spent: spent + amount }
        });
        let new_spent = new_note.get_note().spent;
        new_note.deliver_to(pool, quiet(pool));

        let remaining = limit - new_spent;
        self.emit(AllowanceSpent { amount, remaining, month }).deliver_to(pool, quiet(pool));
        self.emit(MemberSpent { member, amount, month }).deliver_to(config.admin, quiet(pool));
        remaining
    }

    // ---- generated read model: runs in the reader's PXE only (needs the pool key in scope) ----
    // (state, limit, spent this month, month since grant), at the latest block's time.
    #[external("utility")]
    unconstrained fn read_pool() -> pub (u8, u128, u128, u32) {
        let pool = self.address;
        if !self.storage.config.at(pool).is_initialized() {
            (STATE_NONE, 0, 0, 0)
        } else {
            let c = self.storage.config.at(pool).view_note();
            let month = month_index(self.context.timestamp()) - c.start_month;
            let slot = self.storage.months.at(month as Field).at(pool);
            let spent = if slot.is_initialized() { slot.view_note().spent } else { 0 };
            (machine::state_at(true, month, spent, c.limit), c.limit, spent, month)
        }
    }

    // membership as of the latest block, from a device that knows the salt (any key holder)
    #[external("utility")]
    unconstrained fn read_membership(member: AztecAddress) -> pub u8 {
        let c = self.storage.config.at(self.address).view_note();
        self.storage.members.at(marker_of(member, c.salt)).get_current_value()
    }

    // public view by marker: what ANYONE can see (current value, scheduled value, when it takes effect)
    #[external("public")]
    #[view]
    fn public_membership(marker: Field) -> (u8, u8, u64) {
        let (scheduled, at) = self.storage.members.at(marker).get_scheduled_value();
        (self.storage.members.at(marker).get_current_value(), scheduled, at)
    }

    // spike evidence only: the marker a key holder computes (to look up the public view above)
    #[external("utility")]
    unconstrained fn marker(member: AztecAddress) -> pub Field {
        marker_of(member, self.storage.config.at(self.address).view_note().salt)
    }
}
```

`/tmp/spike-noir/allowance/role_pool_test/Nargo.toml`
```toml
[package]
name = "role_pool_test"
type = "lib"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-nr", tag="v5.3.0", directory="aztec" }
role_pool_contract = { path = "../role_pool_contract" }
```

`/tmp/spike-noir/allowance/role_pool_test/src/lib.nr`
```rust
// Generated from the blueprint. Do not edit.
// Conformance tests for `allowance` design E2 (role gate with a delayed revoke), target noir, run in the TXE.
mod conformance;
mod probes;
mod planted;
```

`/tmp/spike-noir/allowance/role_pool_test/src/conformance.nr`
```rust
// Generated from the blueprint. Do not edit.
use aztec::{
    protocol::address::AztecAddress,
    test::helpers::test_environment::{CallPrivateOptions, DeployOptions, TestEnvironment},
};
use role_pool_contract::RolePool;
use role_pool_contract::generated::types::{
    MEMBER_ACTIVE, MEMBER_NONE, MEMBER_REVOKED, STATE_ACTIVE, STATE_EXHAUSTED, STATE_EXPIRED,
};
use role_pool_contract::generated::calendar::month_start;

pub global T0: u64 = 1894665600; // 2030-01-15T00:00:00Z
pub global T_FEB: u64 = 1896134400; // 2030-02-01T00:00:00Z
pub global START_MONTH: u32 = 2030 * 12;
pub global LIMIT: u128 = 100;
pub global POOL_SECRET: Field = 0x9001;
pub global DELAY: u64 = 3600; // RolePool::MEMBERSHIP_DELAY

pub struct Pool { pub env: TestEnvironment, pub pool: AztecAddress, pub admin: AztecAddress, pub m1: AztecAddress, pub m2: AztecAddress, pub stranger: AztecAddress }

impl Pool {
    // every call carries the pool's scope: the caller's device holds the pool's secret key
    pub unconstrained fn spend(self, who: AztecAddress, amount: u128) -> u128 {
        self.env.call_private_opts(who, CallPrivateOptions::new().with_additional_scopes([self.pool]), RolePool::at(self.pool).spend(amount))
    }
    pub unconstrained fn add(self, who: AztecAddress, member: AztecAddress) {
        self.env.call_private_opts(who, CallPrivateOptions::new().with_additional_scopes([self.pool]), RolePool::at(self.pool).add_member(member))
    }
    pub unconstrained fn revoke(self, who: AztecAddress, member: AztecAddress) {
        self.env.call_private_opts(who, CallPrivateOptions::new().with_additional_scopes([self.pool]), RolePool::at(self.pool).revoke_member(member))
    }
    pub unconstrained fn read(self) -> (u8, u128, u128, u32) {
        self.env.execute_utility(RolePool::at(self.pool).read_pool())
    }
    pub unconstrained fn membership(self, member: AztecAddress) -> u8 {
        self.env.execute_utility(RolePool::at(self.pool).read_membership(member))
    }
    /// mine an empty block `secs` after the last one
    pub unconstrained fn wait(self, secs: u64) {
        self.env.mine_block_at(self.env.last_block_timestamp() + secs);
    }
}

/// granted, no members
pub unconstrained fn granted() -> Pool {
    let mut env = TestEnvironment::new();
    let admin = env.create_light_account();
    let m1 = env.create_light_account();
    let m2 = env.create_light_account();
    let stranger = env.create_light_account();
    let pool = env.deploy_opts(DeployOptions::new().with_secret(POOL_SECRET), "@role_pool_contract/RolePool").without_initializer();
    env.mine_block_at(T0);
    env.call_private_opts(admin, CallPrivateOptions::new().with_additional_scopes([pool]), RolePool::at(pool).grant(LIMIT));
    Pool { env, pool, admin, m1, m2, stranger }
}

/// granted, two members added, their membership in effect
pub unconstrained fn with_members() -> Pool {
    let p = granted();
    p.add(p.admin, p.m1);
    p.add(p.admin, p.m2);
    p.wait(DELAY);
    p
}

// ---------------- grant ----------------
#[test]
unconstrained fn grant_from_none() {
    let p = granted();
    assert_eq(p.read(), (STATE_ACTIVE, LIMIT, 0, 0));
}

// A second grant re-emits the config's initialization nullifier: refused by the protocol, not by a typed refusal.
#[test(should_fail)]
unconstrained fn grant_twice() {
    let p = granted();
    p.env.call_private_opts(p.admin, CallPrivateOptions::new().with_additional_scopes([p.pool]), RolePool::at(p.pool).grant(LIMIT));
}

// ---------------- membership: add ----------------
#[test]
unconstrained fn add_takes_effect_after_the_delay() {
    let p = granted();
    p.add(p.admin, p.m1);
    assert_eq(p.membership(p.m1), MEMBER_NONE);
    p.wait(DELAY - 1);
    assert_eq(p.membership(p.m1), MEMBER_NONE);
    p.wait(1);
    assert_eq(p.membership(p.m1), MEMBER_ACTIVE);
}

#[test(should_fail_with = "[AL-021] AllowanceNotMember")]
unconstrained fn spend_before_add_takes_effect() {
    let p = granted();
    p.add(p.admin, p.m1);
    p.wait(DELAY - 1);
    let _ = p.spend(p.m1, 1);
}

#[test(should_fail_with = "[AL-020] AllowanceNotAdmin")]
unconstrained fn add_by_member() {
    let p = with_members();
    p.add(p.m1, p.stranger);
}

#[test(should_fail_with = "[AL-030] MembershipCannotAdd { state: 1 }")]
unconstrained fn add_twice() {
    let p = with_members();
    p.add(p.admin, p.m1);
}

// ---------------- spend ----------------
#[test]
unconstrained fn members_share_one_allowance() {
    let p = with_members();
    assert_eq(p.spend(p.m1, 30), 70);
    assert_eq(p.spend(p.m2, 20), 50);
    assert_eq(p.read(), (STATE_ACTIVE, LIMIT, 50, 0));
}

#[test]
unconstrained fn spend_to_exhausted() {
    let p = with_members();
    assert_eq(p.spend(p.m1, LIMIT), 0);
    assert_eq(p.read().0, STATE_EXHAUSTED);
}

#[test(should_fail_with = "[AL-002] AllowanceCannotSpend { state: 2 }")]
unconstrained fn spend_from_exhausted() {
    let p = with_members();
    let _ = p.spend(p.m1, LIMIT);
    let _ = p.spend(p.m2, 1);
}

#[test(should_fail_with = "[AL-010] AllowanceExceeded { remaining: 40 }")]
unconstrained fn spend_over_limit() {
    let p = with_members();
    let _ = p.spend(p.m1, 60);
    let _ = p.spend(p.m2, 41);
}

#[test(should_fail_with = "[AL-021] AllowanceNotMember")]
unconstrained fn spend_by_stranger_with_the_pool_key() {
    // even holding the pool's key (the TXE shares one PXE), a non-member cannot pass the role gate
    let p = with_members();
    let _ = p.spend(p.stranger, 1);
}

#[test(should_fail_with = "[AL-021] AllowanceNotMember")]
unconstrained fn spend_by_admin() {
    let p = with_members();
    let _ = p.spend(p.admin, 1);
}

// ---------------- membership: revoke with a delay ----------------
#[test]
unconstrained fn revoked_member_spends_until_the_delay_elapses() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    assert_eq(p.membership(p.m1), MEMBER_ACTIVE);
    p.wait(DELAY - 2);
    let _ = p.spend(p.m1, 5); // still in effect: the revoke has not bitten yet
    assert_eq(p.read().2, 5);
}

#[test(should_fail_with = "[AL-021] AllowanceNotMember")]
unconstrained fn revoked_member_fails_after_the_delay() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    p.wait(DELAY);
    assert_eq(p.membership(p.m1), MEMBER_REVOKED);
    let _ = p.spend(p.m1, 1);
}

#[test]
unconstrained fn other_members_unaffected_by_a_revoke() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    p.wait(DELAY);
    assert_eq(p.spend(p.m2, 10), 90);
}

#[test(should_fail_with = "[AL-031] MembershipCannotRevoke { state: 2 }")]
unconstrained fn revoke_twice_before_it_takes_effect() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    p.revoke(p.admin, p.m1);
}

#[test(should_fail_with = "[AL-031] MembershipCannotRevoke { state: 0 }")]
unconstrained fn revoke_a_non_member() {
    let p = with_members();
    p.revoke(p.admin, p.stranger);
}

#[test(should_fail_with = "[AL-020] AllowanceNotAdmin")]
unconstrained fn revoke_by_member() {
    let p = with_members();
    p.revoke(p.m2, p.m1);
}

// ---------------- time: month slots and the year ----------------
#[test]
unconstrained fn new_month_is_a_new_slot() {
    let p = with_members();
    let _ = p.spend(p.m1, LIMIT);
    p.env.mine_block_at(T_FEB);
    assert_eq(p.spend(p.m2, 25), 75);
    assert_eq(p.read(), (STATE_ACTIVE, LIMIT, 25, 1));
}

#[test]
unconstrained fn last_month_of_the_year_still_spends() {
    let p = with_members();
    p.env.mine_block_at(month_start(START_MONTH + 11) + 10);
    assert_eq(p.spend(p.m1, 1), 99);
    assert_eq(p.read().3, 11);
}

#[test(should_fail_with = "[AL-002] AllowanceCannotSpend { state: 3 }")]
unconstrained fn expired_after_twelve_months() {
    let p = with_members();
    p.env.mine_block_at(month_start(START_MONTH + 12));
    assert_eq(p.read().0, STATE_EXPIRED);
    let _ = p.spend(p.m1, 1);
}
```

`/tmp/spike-noir/allowance/role_pool_test/src/probes.nr`
```rust
// NOT generated: probes of the platform (does the TXE enforce a tx's expiration timestamp?).
// Each probe builds a tx whose anchor is at time A and lands in a block at time > its expiration bound.
// If the TXE enforced expiration, these calls would fail; they are written to PASS when it does NOT enforce.
use crate::conformance::{DELAY, T0, with_members};
use role_pool_contract::generated::calendar::month_start;
use role_pool_contract::generated::types::MEMBER_REVOKED;

// (1) the DelayedPublicMutable bound: anchor + DELAY. The tx lands DELAY + 1 hour after its anchor.
#[test]
unconstrained fn probe_txe_ignores_membership_horizon() {
    let p = with_members();
    let anchor = p.env.last_block_timestamp();
    p.env.set_next_block_timestamp(anchor + DELAY + 3600);
    let _ = p.spend(p.m1, 1);
    assert_eq(p.env.last_block_timestamp(), anchor + DELAY + 3600); // it really landed past its bound
}

// (2) the revoke case: proven while the revoke is pending (anchor before the change), lands after it took effect.
#[test]
unconstrained fn probe_txe_lets_a_revoked_spend_land_late() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    let anchor = p.env.last_block_timestamp();
    p.env.set_next_block_timestamp(anchor + DELAY + 60);
    let _ = p.spend(p.m1, 1);
    // the spend landed in a block where the member is already revoked
    assert_eq(p.membership(p.m1), MEMBER_REVOKED);
}

// (3) the month-end bound: anchor 31 Jan 23:30, lands 1 Feb 00:30, debits January's slot.
#[test]
unconstrained fn probe_txe_ignores_month_end_bound() {
    let p = with_members();
    let feb = month_start(2030 * 12 + 1);
    p.env.mine_block_at(feb - 1800);
    p.env.set_next_block_timestamp(feb + 1800);
    let _ = p.spend(p.m1, 7);
    assert_eq(p.env.last_block_timestamp(), feb + 1800);
    assert_eq(p.read(), (1, 100, 0, 1)); // February's slot is empty: the spend debited January's
    let _ = T0;
}
```

`/tmp/spike-noir/allowance/role_pool_test/src/planted.nr`
```rust
// NOT generated: a deliberately wrong test. It claims a revoked member can still spend once the delay has elapsed;
// it must FAIL with AllowanceNotMember.
use crate::conformance::{DELAY, with_members};

#[test]
unconstrained fn planted_revoked_member_spends_after_delay() {
    let p = with_members();
    p.revoke(p.admin, p.m1);
    p.wait(DELAY);
    let _ = p.spend(p.m1, 1);
}
```

`/tmp/spike-noir/allowance/delay_probe_contract/Nargo.toml`
```toml
[package]
name = "delay_probe_contract"
type = "contract"

[dependencies]
aztec = { git="https://github.com/AztecProtocol/aztec-nr", tag="v5.3.0", directory="aztec" }
```

`/tmp/spike-noir/allowance/delay_probe_contract/src/main.nr`
```rust
// NOT generated: spike probe for the smallest workable DelayedPublicMutable delay on aztec 5.3.0.
// One DelayedPublicMutable per key, initial delay 1 s. `set_delay` raises a key's delay (raises take effect at once);
// `read` reads the key privately, which bounds the tx's expiration to anchor + delay.
use aztec::macros::aztec;

#[aztec]
pub contract DelayProbe {
    use aztec::{macros::{functions::external, storage::storage}, state_vars::{DelayedPublicMutable, Map}};

    global INITIAL_DELAY: u64 = 1;

    #[storage]
    struct Storage<Context> {
        flags: Map<Field, DelayedPublicMutable<u8, INITIAL_DELAY, Context>, Context>,
    }

    #[external("public")]
    fn set_delay(key: Field, delay: u64) {
        self.storage.flags.at(key).schedule_delay_change(delay);
    }

    #[external("private")]
    fn read(key: Field) -> u8 {
        self.storage.flags.at(key).get_current_value()
    }

    // a private tx that reads nothing delayed (control: expiration = anchor + 24 h)
    #[external("private")]
    fn noop(x: Field) -> Field {
        x
    }
}
```

`/tmp/spike-noir/client/package.json` (changed; written by npm from the install command above)
```json
{"name":"allowance-client","private":true,"type":"module","dependencies":{"@aztec/accounts":"^5.3.0","@aztec/aztec.js":"^5.3.0","@aztec/foundation":"^5.3.0","@aztec/noir-contracts.js":"^5.3.0","@aztec/pxe":"^5.3.0","@aztec/stdlib":"^5.3.0","@aztec/wallet-sdk":"^5.3.0","@aztec/wallets":"^5.3.0","effect":"^4.1.2","tsx":"^4.23.15","typescript":"^7.0.2"}}
```

`/tmp/spike-noir/client/src/generated/rolePool.ts`
```ts
// Generated from the blueprint. Do not edit.
// target-noir, Effect client for `allowance` design E2 (role gate, delayed revoke) over src/artifacts/RolePool.ts.
//
// Every operation runs on the CALLER'S DEVICE (`runs: "client"`) and is one span with child steps:
//   request -> sync -> [check] -> prove -> submit -> wait
// `check` exists only for operations whose machine is enforced in PUBLIC code (membership moves): a public refusal
// is only visible before submission by simulating the public part, so the client simulates first and decodes it.
// Fees: every device pays through the sponsored fee payment contract (no fee juice on members' accounts; the fee
// payer seen on chain is the sponsor, not the member).
import { Context, Effect, Layer, Schema } from "effect"
import type { AztecAddress } from "@aztec/aztec.js/addresses"
import { waitForTx } from "@aztec/aztec.js/node"
import type { AztecNode } from "@aztec/aztec.js/node"
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee"
import { RolePoolContract } from "../artifacts/RolePool.js"

// ---------- states (same numbering as the Noir target) ----------
export const PoolState = { none: 0, active: 1, exhausted: 2, expired: 3 } as const
export const MemberState = { none: 0, member: 1, revoked: 2 } as const
const nameOf = <T extends Record<string, number>>(t: T, n: number) => (Object.keys(t) as (keyof T)[]).find((k) => t[k] === n) ?? "none"

// ---------- the blueprint's declarations this client was generated from ----------
export const Blueprint = {
  thing: "allowance",
  design: "E2",
  roles: { admin: { holds: "pool key" }, member: { holds: "pool key", gate: "delayed-public" } },
  membership: { storage: "delayed-public", key: "H(member, salt)", takesEffect: "after 1 hour" },
  time: { reset: { every: "calendar_month", by: "slot" }, expire: { after: "12 months", by: "guard" } },
  visibility: {
    limit: "private(pool)", spent: "private(pool)", amount: "private(pool)", member: "private(admin)",
    membershipState: "public (by marker)",
  },
} as const

// ---------- refusals ----------
export class AllowanceCannotGrant extends Schema.TaggedError<AllowanceCannotGrant>()("AllowanceCannotGrant", { state: Schema.Number }) {}
export class AllowanceCannotSpend extends Schema.TaggedError<AllowanceCannotSpend>()("AllowanceCannotSpend", { state: Schema.Number }) {}
export class AllowanceExceeded extends Schema.TaggedError<AllowanceExceeded>()("AllowanceExceeded", { remaining: Schema.BigInt }) {}
export class AllowanceNotAdmin extends Schema.TaggedError<AllowanceNotAdmin>()("AllowanceNotAdmin", {}) {}
export class AllowanceNotMember extends Schema.TaggedError<AllowanceNotMember>()("AllowanceNotMember", {}) {}
export class MembershipCannotAdd extends Schema.TaggedError<MembershipCannotAdd>()("MembershipCannotAdd", { state: Schema.Number }) {}
export class MembershipCannotRevoke extends Schema.TaggedError<MembershipCannotRevoke>()("MembershipCannotRevoke", { state: Schema.Number }) {}
/** The network refused the proven tx: an existing nullifier (double spend, second grant) or an expired tx. */
export class NetworkRejected extends Schema.TaggedError<NetworkRejected>()("NetworkRejected", { reason: Schema.String }) {}
/** Anything else. The raw message is NOT kept (it may hold private values); only the step is. */
export class AztecFailure extends Schema.TaggedError<AztecFailure>()("AztecFailure", { step: Schema.String }) {}

export type PoolRefusal =
  | AllowanceCannotGrant | AllowanceCannotSpend | AllowanceExceeded | AllowanceNotAdmin | AllowanceNotMember
  | MembershipCannotAdd | MembershipCannotRevoke
export type OpError = PoolRefusal | NetworkRejected | AztecFailure

const REFUSAL = /\[AL-(\d{3})\] (\w+) \{ ?(.*?) ?\}/
export const decodeRefusal = (message: string): PoolRefusal | undefined => {
  const m = REFUSAL.exec(message)
  if (!m) return undefined
  const f: Record<string, string> = {}
  for (const kv of m[3].split(",").map((s) => s.trim()).filter(Boolean)) { const [k, v] = kv.split(":").map((s) => s.trim()); f[k] = v }
  switch (m[2]) {
    case "AllowanceCannotGrant": return new AllowanceCannotGrant({ state: Number(f.state) })
    case "AllowanceCannotSpend": return new AllowanceCannotSpend({ state: Number(f.state) })
    case "AllowanceExceeded": return new AllowanceExceeded({ remaining: BigInt(f.remaining) })
    case "AllowanceNotAdmin": return new AllowanceNotAdmin()
    case "AllowanceNotMember": return new AllowanceNotMember()
    case "MembershipCannotAdd": return new MembershipCannotAdd({ state: Number(f.state) })
    case "MembershipCannotRevoke": return new MembershipCannotRevoke({ state: Number(f.state) })
  }
  return undefined
}
const NETWORK = /(Existing nullifier|existing nullifier|Invalid expiration timestamp|expiration)/
const toFailure = (step: string) => (e: unknown): OpError => {
  const msg = String((e as any)?.message ?? e)
  if (process.env.ARCHITECT_DEVICE_DEBUG) console.error(`[device-debug] ${step}: ${msg.slice(0, 400)}`)
  const refusal = decodeRefusal(msg)
  if (refusal) return refusal
  const n = NETWORK.exec(msg)
  if (n && step === "submit") return new NetworkRejected({ reason: n[0] })
  return new AztecFailure({ step })
}

// ---------- the redaction rule (allowlist) ----------
export const ALLOWED_ATTRIBUTES = new Set([
  "architect.thing", "architect.operation", "architect.step", "architect.runs", "architect.role", "architect.outcome",
  "aztec.witgen_ms", "aztec.proving_ms", "aztec.functions", "aztec.fee_payer",
  "device.tx_hash",
])
export const DEVICE_ONLY = new Set(["device.tx_hash"])
export const exportable = (attrs: ReadonlyMap<string, unknown>) => Object.fromEntries([...attrs].filter(([k]) => !DEVICE_ONLY.has(k)))
const safe = (attrs: Record<string, unknown>) => {
  for (const k of Object.keys(attrs)) if (!ALLOWED_ATTRIBUTES.has(k)) throw new Error(`redaction: attribute ${k} is not allowlisted`)
  return attrs
}

// ---------- the client ----------
export type Role = "admin" | "member" | "other"
export interface PoolView { readonly state: string; readonly limit: bigint; readonly spent: bigint; readonly month: number }
export interface Timings { witgenMs: number; provingMs: number; proveMs: number; submitMs: number; waitMs: number; totalMs: number }
/** `anchorTs` and `expiresAt` are what the chain sees of time: kept for the report, never put in spans. */
export interface OpResult { txHash: string; timings: Timings; anchorTs: number; expiresAt: number; returned?: unknown }
export interface Proven { readonly anchorTs: number; readonly expiresAt: number; readonly submit: Effect.Effect<OpResult, OpError> }

export interface RolePoolShape {
  readonly grant: (limit: bigint) => Effect.Effect<OpResult, OpError>
  readonly addMember: (member: AztecAddress) => Effect.Effect<OpResult, OpError>
  readonly revokeMember: (member: AztecAddress) => Effect.Effect<OpResult, OpError>
  readonly spend: (amount: bigint) => Effect.Effect<OpResult, OpError>
  /** stretch: a real private token transfer out of the pool (token notes owned by the pool address) */
  readonly spendTo: (token: AztecAddress, to: AztecAddress, amount: bigint) => Effect.Effect<OpResult, OpError>
  /** prove now, submit later: used to show the rollup refuses a spend proven before a revoke took effect */
  readonly proveSpend: (amount: bigint) => Effect.Effect<Proven, OpError>
  readonly read: () => Effect.Effect<PoolView, AztecFailure>
  readonly membership: (member: AztecAddress) => Effect.Effect<string, AztecFailure>
}
export class RolePoolClient extends Context.Service<RolePoolClient, RolePoolShape>()("architect/RolePoolClient") {}

export interface DeviceConfig {
  readonly wallet: any; readonly node: AztecNode; readonly from: AztecAddress; readonly pool: AztecAddress
  readonly role: Role; readonly sponsor: AztecAddress
}
export class Device extends Context.Service<Device, DeviceConfig>()("architect/Device") {}

const ms = (t0: number) => Math.round((performance.now() - t0) * 10) / 10

export const RolePoolLive = Layer.effect(RolePoolClient, Effect.gen(function* () {
  const d = yield* Device
  const c = RolePoolContract.at(d.pool, d.wallet)
  const w = d.wallet as any
  const fee = { paymentMethod: new SponsoredFeePaymentMethod(d.sponsor) }
  const scopes = () => w.scopesFrom(d.from, [d.pool])
  const step = (op: string, s: string, runs = "client") => Effect.withSpan(`pool.${op}.${s}`, { attributes: safe({ "architect.step": s, "architect.runs": runs }) })

  const prove = (op: string, interaction: any, checkPublic: boolean, tagsAsPool = false) => Effect.gen(function* () {
    // tags of messages the called contracts deliver are derived from the pool, not the member (recipients learn no member)
    const tagSender = tagsAsPool ? w.senderForTagsFrom(d.from, d.pool) : w.senderForTagsFrom(d.from)
    const payload: any = yield* Effect.tryPromise({ try: () => interaction.request({ fee }), catch: toFailure("request") }).pipe(step(op, "request"))
    yield* Effect.tryPromise({ try: () => w.pxe.sync(), catch: toFailure("sync") }).pipe(step(op, "sync"))
    const req: any = yield* Effect.tryPromise({
      try: async () => w.createTxExecutionRequestFromPayloadAndFee(payload, d.from, await w.completeFeeOptions({ from: d.from, feePayer: payload.feePayer })),
      catch: toFailure("request"),
    })
    if (checkPublic) {
      // public machine: simulate the public part to surface a typed refusal before paying for a proof
      const sim: any = yield* Effect.tryPromise({
        try: () => w.pxe.simulateTx(req, { simulatePublic: true, scopes: scopes(), senderForTags: w.senderForTagsFrom(d.from) }),
        catch: toFailure("check"),
      }).pipe(step(op, "check"))
      const revert = sim?.publicOutput?.revertReason ?? sim?.revertReason
      if (revert) return yield* Effect.fail(toFailure("check")(revert))
    }
    const t0 = performance.now()
    const proven: any = yield* Effect.tryPromise({
      try: () => w.pxe.proveTx(req, { scopes: scopes(), senderForTags: tagSender }),
      catch: toFailure("prove"),
    }).pipe(
      Effect.tap((p: any) => Effect.annotateCurrentSpan(safe({
        "aztec.witgen_ms": Math.round((p.stats?.timings?.perFunction ?? []).reduce((a: number, f: any) => a + f.time, 0)),
        "aztec.proving_ms": Math.round(p.stats?.timings?.proving ?? -1),
        "aztec.functions": (p.stats?.timings?.perFunction ?? []).length,
        "aztec.fee_payer": "sponsored",
      }))),
      step(op, "prove"),
    )
    const proveMs = ms(t0)
    const t = proven.stats?.timings ?? {}
    const witgenMs = (t.perFunction ?? []).reduce((a: number, f: any) => a + f.time, 0)
    const anchorTs = Number(proven.publicInputs.constants.anchorBlockHeader.globalVariables.timestamp)
    const expiresAt = Number(proven.publicInputs.expirationTimestamp)
    const returned = proven.privateExecutionResult?.entrypoint?.nestedExecutionResults?.at(-1)?.returnValues
    const submit = Effect.gen(function* () {
      const tx: any = yield* Effect.tryPromise({ try: async () => proven.toTx(), catch: toFailure("submit") })
      const txHash: any = yield* Effect.tryPromise({ try: async () => tx.getTxHash(), catch: toFailure("submit") })
      const t1 = performance.now()
      yield* Effect.tryPromise({ try: () => d.node.sendTx(tx), catch: toFailure("submit") }).pipe(
        Effect.withSpan(`pool.${op}.submit`, { attributes: safe({ "architect.step": "submit", "architect.runs": "client", "device.tx_hash": txHash.toString() }) }))
      const submitMs = ms(t1)
      const t2 = performance.now()
      const receipt: any = yield* Effect.tryPromise({ try: () => waitForTx(d.node, txHash, { interval: 0.25 } as any), catch: toFailure("submit") }).pipe(step(op, "wait", "chain"))
      if (receipt?.status && !String(receipt.status).toLowerCase().includes("success") && String(receipt.status) !== "mined" && receipt.executionResult && receipt.executionResult !== "success")
        return yield* Effect.fail(new NetworkRejected({ reason: `reverted:${receipt.executionResult}` }))
      return { txHash: txHash.toString(), anchorTs, expiresAt, returned, timings: { witgenMs, provingMs: t.proving ?? NaN, proveMs, submitMs, waitMs: ms(t2), totalMs: 0 } }
    })
    return { anchorTs, expiresAt, submit } as Proven
  })

  const span = (op: string) => <A, E>(eff: Effect.Effect<A, E>) => eff.pipe(
    Effect.tapError((e: any) => Effect.annotateCurrentSpan(safe({ "architect.outcome": e._tag }))),
    Effect.tap(() => Effect.annotateCurrentSpan(safe({ "architect.outcome": "ok" }))),
    Effect.withSpan(`pool.${op}`, { attributes: safe({ "architect.thing": "allowance", "architect.operation": op, "architect.runs": "client", "architect.role": d.role }) }),
  )
  const run = (op: string, interaction: any, checkPublic = false, tagsAsPool = false) => Effect.gen(function* () {
    const t0 = performance.now()
    const p = yield* prove(op, interaction, checkPublic, tagsAsPool)
    const r = yield* p.submit
    r.timings.totalMs = ms(t0)
    return r
  }).pipe(span(op))

  const util = <A>(name: string, f: () => Promise<A>) => Effect.tryPromise({ try: f, catch: (e) => toFailure("read")(e) as AztecFailure }).pipe(
    Effect.withSpan(`pool.${name}`, { attributes: safe({ "architect.thing": "allowance", "architect.operation": name, "architect.runs": "client", "architect.role": d.role }) }))

  return {
    grant: (limit) => run("grant", c.methods.grant(limit)),
    addMember: (m) => run("addMember", c.methods.add_member(m), true),
    revokeMember: (m) => run("revokeMember", c.methods.revoke_member(m), true),
    spend: (amount) => run("spend", c.methods.spend(amount)),
    spendTo: (token, to, amount) => run("spendTo", c.methods.spend_to(token, to, amount), false, true),
    proveSpend: (amount) => prove("spend", c.methods.spend(amount), false).pipe(span("spend")),
    read: () => util("read", async () => {
      await w.pxe.sync()
      const { result } = await c.methods.read_pool().simulate({ from: d.from, additionalScopes: [d.pool] } as any)
      const [s, limit, spent, month] = result as [bigint, bigint, bigint, bigint]
      return { state: String(nameOf(PoolState, Number(s))), limit, spent, month: Number(month) }
    }),
    membership: (m) => util("membership", async () => {
      const { result } = await c.methods.read_membership(m).simulate({ from: d.from, additionalScopes: [d.pool] } as any)
      return String(nameOf(MemberState, Number(result)))
    }),
  }
}))
```

`/tmp/spike-noir/client/src/devices.ts`
```ts
// Spike setup (not generated): one wallet per person, each with its own PXE and keys; the sponsored fee contract.
import { createAztecNodeClient, waitForNode } from "@aztec/aztec.js/node"
import { EmbeddedWallet } from "@aztec/wallets/embedded"
import { getInitialTestAccountsData } from "@aztec/accounts/testing"
import { Fr, GrumpkinScalar } from "@aztec/aztec.js/fields"
import { getContractInstanceFromInstantiationParams } from "@aztec/aztec.js/contracts"
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee"
import { SponsoredFPCContract } from "@aztec/noir-contracts.js/SponsoredFPC"
import { SPONSORED_FPC_SALT } from "@aztec/constants"

export const NODE = "http://localhost:8080"

export async function connect() {
  const node = createAztecNodeClient(NODE)
  await waitForNode(node)
  const fpcInstance = await getContractInstanceFromInstantiationParams(SponsoredFPCContract.artifact, { salt: new Fr(SPONSORED_FPC_SALT) })
  return { node, sponsor: fpcInstance.address, fpcInstance }
}

export type Person = { wallet: any; address: any; name: string }

/** `funded` = one of the local network's prefunded test accounts; otherwise a fresh account holding no fee juice. */
export async function person(node: any, fpcInstance: any, name: string, opts: { funded?: number; prove?: boolean } = {}): Promise<Person> {
  const wallet = await EmbeddedWallet.create(node, { ephemeral: true, pxe: { proverEnabled: opts.prove ?? true } as any })
  await wallet.registerContract(fpcInstance, SponsoredFPCContract.artifact)
  let acct: any
  if (opts.funded !== undefined) {
    const a = (await getInitialTestAccountsData())[opts.funded]
    acct = await wallet.createSchnorrInitializerlessAccount(a.secret, a.salt, a.signingKey)
  } else {
    acct = await wallet.createSchnorrInitializerlessAccount(Fr.random(), Fr.random(), GrumpkinScalar.random())
  }
  return { wallet, address: acct.address, name }
}

export const sponsored = (sponsor: any) => ({ paymentMethod: new SponsoredFeePaymentMethod(sponsor) })
```

`/tmp/spike-noir/client/src/probe-delay.ts`
```ts
// Spike probe (not generated): the smallest DelayedPublicMutable delay a private read survives on the local network.
// For each delay D: raise key D's delay to D (immediate), then prove a private read of key D and submit it.
import { waitForTx } from "@aztec/aztec.js/node"
import { DelayProbeContract } from "./artifacts/DelayProbe.js"
import { connect, person, sponsored } from "./devices.js"

const { node, sponsor, fpcInstance } = await connect()
const P = await person(node, fpcInstance, "prober", { funded: 0, prove: true })
const fee = sponsored(sponsor)
const { contract } = await DelayProbeContract.deploy(P.wallet).send({ from: P.address, fee } as any)
const c = DelayProbeContract.at(contract.address, P.wallet)
const w = P.wallet as any
const iso = (t: number) => new Date(t * 1000).toISOString().slice(11, 19)

async function proveAndSend(interaction: any, label: string) {
  await w.pxe.sync()
  const payload = await interaction.request({ fee })
  const req = await w.createTxExecutionRequestFromPayloadAndFee(payload, P.address, await w.completeFeeOptions({ from: P.address, feePayer: payload.feePayer }))
  const t0 = performance.now()
  let proven: any
  try { proven = await w.pxe.proveTx(req, { scopes: [P.address], senderForTags: P.address }) }
  catch (e: any) { console.log(`PROBE ${label}: PROVE REFUSED: ${e.message.slice(0, 160)}`); return }
  const anchor = Number(proven.publicInputs.constants.anchorBlockHeader.globalVariables.timestamp)
  const exp = Number(proven.publicInputs.expirationTimestamp)
  const proveMs = Math.round(performance.now() - t0)
  const tx = await proven.toTx()
  try {
    await node.sendTx(tx)
    const r: any = await waitForTx(node, tx.getTxHash(), { interval: 0.25, timeout: 300 } as any)
    const blk: any = await (node as any).getBlockData(r.blockNumber)
    const bts = Number(blk.header.globalVariables.timestamp)
    console.log(`PROBE ${label}: anchor ${iso(anchor)} expires +${exp - anchor}s  prove ${proveMs} ms  mined in block ${r.blockNumber} at +${bts - anchor}s  -> OK`)
  } catch (e: any) {
    console.log(`PROBE ${label}: anchor ${iso(anchor)} expires +${exp - anchor}s  prove ${proveMs} ms  -> REJECTED: ${e.message.slice(0, 120)}`)
  }
}

await proveAndSend(c.methods.noop(1n), "control (no delayed read)")
for (const D of [1, 12, 24, 36, 60, 120, 600, 1800, 3600, 5400, 86400]) {
  if (D > 1) await c.methods.set_delay(BigInt(D), BigInt(D)).send({ from: P.address, fee } as any)
  await proveAndSend(c.methods.read(BigInt(D)), `delay ${D}s`)
}
process.exit(0)
```

`/tmp/spike-noir/client/src/run-e2.ts`
```ts
// Spike runner (not generated): design E2 end to end on the local network, from Effect.
// Admin + two members + a stranger, each with an own device (wallet, PXE, keys). None holds fee juice: every tx
// is paid by the sponsored fee payment contract.
import { Effect, Layer, Tracer, Exit } from "effect"
import { EthCheatCodes } from "@aztec/ethereum/test"
import { TestDateProvider } from "@aztec/foundation/timer"
import { deriveKeys } from "@aztec/aztec.js/keys"
import { Fr } from "@aztec/aztec.js/fields"
import { writeFileSync } from "node:fs"
import { RolePoolContract } from "./artifacts/RolePool.js"
import { AllowanceContract } from "./artifacts/Allowance.js"
import { RolePoolClient, RolePoolLive, Device, exportable, type RolePoolShape, type Role } from "./generated/rolePool.js"
import { connect, person, sponsored, type Person } from "./devices.js"

const spans: Tracer.NativeSpan[] = []
const tracer = Tracer.make({ span(o) { const s = new Tracer.NativeSpan(o); spans.push(s); return s } })
const PRIVATE = new Set<bigint>()
const priv = (v: bigint) => (PRIVATE.add(v), v)
const log = (...a: unknown[]) => console.log(...a)
const iso = (t: number) => new Date(t * 1000).toISOString().replace(".000Z", "Z")
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const stat = (xs: number[]) => ({ n: xs.length, median: Math.round(median(xs)), worst: Math.round(Math.max(...xs)), min: Math.round(Math.min(...xs)) })
const J = (x: unknown) => JSON.stringify(x, (_, v) => typeof v === "bigint" ? v.toString() : v)

async function main() {
  const { node, sponsor, fpcInstance } = await connect()
  const fee = sponsored(sponsor)
  // every person is a FRESH account that was never funded
  const A = await person(node, fpcInstance, "admin"), M1 = await person(node, fpcInstance, "m1"), M2 = await person(node, fpcInstance, "m2"), S = await person(node, fpcInstance, "stranger")
  const F = await person(node, fpcInstance, "filler", { prove: false }) // mines blocks while time is moved
  log("CHECK E0 accounts (fresh, no fee juice):", { admin: A.address.toString(), m1: M1.address.toString(), m2: M2.address.toString(), stranger: S.address.toString(), sponsor: sponsor.toString() })

  // ---------- the pool: a contract deployed with its own secret key ----------
  const poolSecret = Fr.random()
  const { publicKeys } = await deriveKeys(poolSecret)
  let t0 = performance.now()
  const { contract } = await RolePoolContract.deploy(A.wallet, { publicKeys } as any).send({ from: A.address, fee } as any)
  const pool = contract.address
  const instance = (await A.wallet.getContractMetadata(pool)).instance
  for (const p of [A, M1, M2]) { await p.wallet.registerContract(instance, RolePoolContract.artifact, poolSecret); await p.wallet.registerSender(pool, "pool") }
  await S.wallet.registerContract(instance, RolePoolContract.artifact) // the stranger knows the contract, not the key
  log(`CHECK E1 pool deployed (sponsored fee) at ${pool.toString()} in ${Math.round(performance.now() - t0)} ms; admin and both members hold the pool key`)

  const { contract: fillerC } = await AllowanceContract.deploy(F.wallet).send({ from: F.address, fee } as any)
  const filler = () => fillerC.methods.naive_grant(S.address, 1n).send({ from: F.address, fee } as any)
  const eth = new EthCheatCodes(["http://127.0.0.1:8545"], new TestDateProvider())
  const latestTs = async () => Number((await (node as any).getBlockData("latest")).header.globalVariables.timestamp)
  // Each step < 24 h (a tx must land within 24 h of its anchor) and is followed by a block. With `finalize`, L1 blocks are
  // mined after each step so that L2 finality catches up with the moved clock (else the PXE's tagging sync refuses:
  // "Highest aged index must not exceed highest finalized index").
  const finalized = async () => (await (node as any).getChainTips()).finalized.block.number
  const settle = async () => { await (eth as any).mine(130); const target = await node.getBlockNumber(); while ((await finalized()) < target) await new Promise((r) => setTimeout(r, 1000)) }
  const warpTo = async (t: number, finalize = false) => { let cur = await latestTs(), n = 0; while (cur < t) { cur = Math.min(cur + 23 * 3600, t); await eth.warp(cur); await filler(); if (finalize) await settle(); n++ } return n }

  const layerFor = (p: Person, role: Role) => RolePoolLive.pipe(Layer.provide(Layer.succeed(Device, { wallet: p.wallet, node, from: p.address, pool, role, sponsor })))
  const as = <A, E>(p: Person, role: Role, f: (c: RolePoolShape) => Effect.Effect<A, E>) =>
    Effect.runPromiseExit(Effect.gen(function* () { const c = yield* RolePoolClient; return yield* f(c) }).pipe(Effect.provide(layerFor(p, role)), Effect.withTracer(tracer)))
  const ok = async <A>(p: Person, role: Role, f: (c: RolePoolShape) => Effect.Effect<A, any>): Promise<A> => {
    const e = await as(p, role, f); if (Exit.isFailure(e)) throw new Error(`unexpected failure (${p.name}): ${J(e.cause)}`); return e.value
  }
  const fails = async (p: Person, role: Role, f: (c: RolePoolShape) => Effect.Effect<any, any>) => {
    const e = await as(p, role, f); if (Exit.isSuccess(e)) return "UNEXPECTED SUCCESS"
    const err: any = (e.cause as any).reasons?.[0]?.error ?? (e.cause as any).failures?.[0] ?? e.cause
    const { _tag, ...rest } = err; return `${_tag} ${J(rest)}`
  }
  const views = async () => ({
    admin: J(await ok(A, "admin", (c) => c.read())), m1: J(await ok(M1, "member", (c) => c.read())), m2: J(await ok(M2, "member", (c) => c.read())),
    stranger: await fails(S, "other", (c) => c.read()),
  })
  const markerOf = async (m: Person) => (await RolePoolContract.at(pool, A.wallet).methods.marker(m.address).simulate({ from: A.address, additionalScopes: [pool] } as any)).result
  const publicView = async (marker: any) => { const r = (await RolePoolContract.at(pool, S.wallet).methods.public_membership(marker).simulate({ from: S.address } as any)).result as any; return { current: Number(r[0]), scheduled: Number(r[1]), at: iso(Number(r[2])) } }
  const spendTimes: number[] = [], spendProving: number[] = [], spendTotal: number[] = []
  const recSpend = (r: any) => { spendTimes.push(r.timings.proveMs); spendProving.push(r.timings.provingMs); spendTotal.push(r.timings.totalMs) }
  const bound = (r: { anchorTs: number; expiresAt: number }) => `anchor ${iso(r.anchorTs)}, expires anchor+${r.expiresAt - r.anchorTs}s (${iso(r.expiresAt)})`

  // ---------- grant ----------
  const LIMIT = priv(250_000n)
  const g = await ok(A, "admin", (c) => c.grant(LIMIT))
  log(`CHECK E2 grant: ${bound(g)}; prove ${Math.round(g.timings.proveMs)} ms`)
  log("CHECK E2.1 views after grant:", await views())
  log("CHECK E2.2 second grant ->", await fails(A, "admin", (c) => c.grant(LIMIT)))

  // ---------- add members (delayed) ----------
  const a1 = await ok(A, "admin", (c) => c.addMember(M1.address))
  const a2 = await ok(A, "admin", (c) => c.addMember(M2.address))
  log(`CHECK E3 addMember x2: ${bound(a1)}; prove ${Math.round(a1.timings.proveMs)} ms, ${Math.round(a2.timings.proveMs)} ms`)
  const mk1 = await markerOf(M1), mk2 = await markerOf(M2)
  log("CHECK E3.1 public view of m1's membership (anyone, by marker):", await publicView(mk1), " marker:", String(mk1).slice(0, 18) + "…")
  log("CHECK E3.2 m1 spends before the add takes effect ->", await fails(M1, "member", (c) => c.spend(priv(5n))))
  log("CHECK E3.3 admin adds m1 again ->", await fails(A, "admin", (c) => c.addMember(M1.address)))
  log("CHECK E3.4 m1 tries to add the stranger ->", await fails(M1, "member", (c) => c.addMember(S.address)))
  log("CHECK E3.5 m1 membership seen by m2 (holds the salt):", await ok(M2, "member", (c) => c.membership(M1.address)))

  const steps1 = await warpTo((await latestTs()) + 3600 + 30)
  log(`CHECK E4 moved time 1 h (${steps1} step); m1 public view now:`, await publicView(mk1))

  // ---------- spends by two members from one allowance ----------
  const s1 = await ok(M1, "member", (c) => c.spend(priv(1013n))); recSpend(s1)
  log(`CHECK E4.1 m1 spend: ${bound(s1)}; prove ${Math.round(s1.timings.proveMs)} ms total ${Math.round(s1.timings.totalMs)} ms`)
  const s2 = await ok(M2, "member", (c) => c.spend(priv(2027n))); recSpend(s2)
  log(`CHECK E4.2 m2 spend: ${bound(s2)}; prove ${Math.round(s2.timings.proveMs)} ms`)
  priv(3040n); priv(LIMIT - 1013n); priv(LIMIT - 3040n)
  log("CHECK E4.3 views after both spends:", await views())
  // what each device can see of the others
  const evs = async (p: Person, name: "AllowanceSpent" | "MemberSpent" | "MembershipScheduled", scope: any) => {
    const e: any[] = await p.wallet.getPrivateEvents((RolePoolContract as any).events[name], { contractAddress: pool, scopes: [scope], fromBlock: 1, toBlock: (await node.getBlockNumber()) + 1 } as any)
    return e.map((x) => J(x.event))
  }
  log("CHECK E4.4 m2 sees pool events (AllowanceSpent):", await evs(M2, "AllowanceSpent", pool))
  log("CHECK E4.5 m2 sees MemberSpent (spender identity):", await evs(M2, "MemberSpent", M2.address), " via pool scope:", await evs(M2, "MemberSpent", pool))
  log("CHECK E4.6 admin sees MemberSpent:", await evs(A, "MemberSpent", A.address))
  log("CHECK E4.7 stranger sees AllowanceSpent:", await evs(S, "AllowanceSpent", S.address).catch((e) => `error ${String(e.message).slice(0, 80)}`))
  log("CHECK E4.8 m2 spends over the limit ->", await fails(M2, "member", (c) => c.spend(LIMIT)))
  log("CHECK E4.9 stranger (no pool key) spends ->", await fails(S, "other", (c) => c.spend(1n)))
  log("CHECK E4.10 admin (holds the key, not a member) spends ->", await fails(A, "admin", (c) => c.spend(1n)))

  let spent = 3040n
  for (let i = 0; i < 4; i++) { const p = i % 2 ? M2 : M1; const a = priv(BigInt(101 + i)); spent += a; priv(spent); priv(LIMIT - spent); recSpend(await ok(p, "member", (c) => c.spend(a))) }

  // ---------- revoke m1: bites after the delay ----------
  const rv = await ok(A, "admin", (c) => c.revokeMember(M1.address))
  const pv = await publicView(mk1)
  log(`CHECK E5 revoke m1: ${bound(rv)}; public view:`, pv)
  const s3 = await ok(M1, "member", (c) => c.spend(priv(7n))); recSpend(s3); spent += 7n; priv(spent); priv(LIMIT - spent)
  log(`CHECK E5.1 m1 spends right after the revoke -> ok; ${bound(s3)}  (change takes effect ${pv.at})`)
  const change = Date.parse(pv.at) / 1000
  await warpTo(change - 600)
  const h1 = await ok(M1, "member", (c) => c.proveSpend(priv(11n)))
  const h2 = await ok(M2, "member", (c) => c.proveSpend(priv(23n)))
  log(`CHECK E5.2 10 min before the change, m1 and m2 each prove a spend and hold it: m1 anchor ${iso(h1.anchorTs)} expires ${iso(h1.expiresAt)} (anchor+${h1.expiresAt - h1.anchorTs}s); m2 anchor ${iso(h2.anchorTs)} expires ${iso(h2.expiresAt)} (anchor+${h2.expiresAt - h2.anchorTs}s)`)
  await warpTo(change + 60)
  log(`CHECK E5.3 moved time to ${iso(await latestTs())}, past the change; m1 public view:`, await publicView(mk1), "; m1 membership seen by m2:", await ok(M2, "member", (c) => c.membership(M1.address)))
  const late1 = await Effect.runPromiseExit(h1.submit.pipe(Effect.withTracer(tracer)))
  log("CHECK E5.4 submit m1's held spend (proven before the change) ->", Exit.isSuccess(late1) ? "UNEXPECTED: mined" : J((late1.cause as any).reasons?.[0]?.error ?? late1.cause))
  const late2 = await Effect.runPromiseExit(h2.submit.pipe(Effect.withTracer(tracer)))
  log("CHECK E5.4b control: submit m2's held spend, same anchor ->", Exit.isSuccess(late2) ? "mined" : J((late2.cause as any).reasons?.[0]?.error ?? late2.cause))
  if (Exit.isSuccess(late2)) { spent += 23n; priv(spent); priv(LIMIT - spent) }
  log("CHECK E5.5 m1 spends after the delay ->", await fails(M1, "member", (c) => c.spend(1n)))
  const s4 = await ok(M2, "member", (c) => c.spend(priv(13n))); recSpend(s4); spent += 13n; priv(spent); priv(LIMIT - spent)
  log(`CHECK E5.6 m2 still spends: ${bound(s4)}`)
  log("CHECK E5.7 admin revokes m1 again ->", await fails(A, "admin", (c) => c.revokeMember(M1.address)))

  // ---------- what the public sees ----------
  const effect = async (h: string) => { const r: any = await node.getTxReceipt(h as any, { includeTxEffect: true } as any); return { r, fx: r.txEffect ?? (await (node as any).getTxEffect(h))?.data } }
  const describe = async (h: string) => {
    const { r, fx } = await effect(h); const s = J(fx)
    return {
      status: r.status, noteHashes: fx.noteHashes?.length, nullifiers: fx.nullifiers?.length, privateLogs: fx.privateLogs?.length,
      publicLogs: fx.publicLogs?.length, publicDataWrites: fx.publicDataWrites?.length, l2ToL1Msgs: fx.l2ToL1Msgs?.length,
      transactionFee: fx.transactionFee?.toString?.(),
      poolAddressVisible: s.includes(pool.toString().slice(2)), m1Visible: s.includes(M1.address.toString().slice(2)), m2Visible: s.includes(M2.address.toString().slice(2)),
      adminVisible: s.includes(A.address.toString().slice(2)), sponsorVisible: s.includes(sponsor.toString().slice(2)),
      markerVisible: s.includes(BigInt(mk1 as any).toString(16).padStart(64, "0")) || s.includes(BigInt(mk2 as any).toString(16).padStart(64, "0")),
    }
  }
  log("CHECK E6.1 public view of a member's spend:", await describe(s2.txHash))
  log("CHECK E6.2 public view of the revoke:", await describe(rv.txHash))
  const tx: any = await (node as any).getTxByHash?.(s2.txHash).catch(() => undefined)
  if (tx) log("CHECK E6.3 spend tx as gossiped: feePayer", tx.data?.feePayer?.toString?.(), "expiration", iso(Number(tx.data?.expirationTimestamp ?? 0)), "publicCalls", tx.data?.numberOfPublicCallRequests?.() ?? tx.publicFunctionCalldata?.length)

  // ---------- month end: a spend proven in November cannot land in December ----------
  const now = await latestTs(), d = new Date(now * 1000)
  const monthEnd = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000
  const steps3 = await warpTo(monthEnd - 1800, true)
  const viewBefore = await ok(M2, "member", (c) => c.read())
  const heldM = await ok(M2, "member", (c) => c.proveSpend(priv(17n)))
  log(`CHECK E7.1 moved to ${iso(await latestTs())} (${steps3} steps); m2 proves a spend: anchor ${iso(heldM.anchorTs)}, expires anchor+${heldM.expiresAt - heldM.anchorTs}s (${iso(heldM.expiresAt)}); view ${J(viewBefore)}`)
  await warpTo(monthEnd + 600, true)
  log(`CHECK E7.2 moved past midnight to ${iso(await latestTs())}`)
  const lateM = await Effect.runPromiseExit(heldM.submit.pipe(Effect.withTracer(tracer)))
  log("CHECK E7.3 submitting the November-proven spend in December ->", Exit.isSuccess(lateM) ? "UNEXPECTED: mined" : J((lateM.cause as any).reasons?.[0]?.error ?? lateM.cause))
  const s5 = await ok(M2, "member", (c) => c.spend(priv(19n))); recSpend(s5)
  log(`CHECK E7.4 m2 spends in December: ${bound(s5)}; view:`, J(await ok(M2, "member", (c) => c.read())))

  // ---------- timings ----------
  log("CHECK E8 spend timings (ms):", J({ proveStep: stat(spendTimes), provingOnly: stat(spendProving.filter((x) => !isNaN(x))), totalPerOp: stat(spendTotal) }))

  // ---------- leak check over recorded spans ----------
  const dump = spans.map((s) => ({ name: s.name, status: s.status._tag, attributes: Object.fromEntries(s.attributes), exported: exportable(s.attributes) }))
  writeFileSync("spans-e2.json", J(dump))
  const text = J(dump)
  const addrs = [A, M1, M2, S].map((p) => p.address.toString().slice(2))
  const hits = [...PRIVATE].filter((v) => v > 99n && (text.includes(`"${v}"`) || text.includes(`:${v},`) || text.includes(`:${v}}`) || text.toLowerCase().includes(v.toString(16).padStart(8, "0"))))
  log(`CHECK E9.1 spans: ${spans.length}; private values tracked: ${PRIVATE.size}; found in spans: ${J(hits.map(String))}; addresses found in exported attributes: ${addrs.filter((a) => J(dump.map((x) => x.exported)).includes(a)).length}; pool key/address in spans: ${text.includes(pool.toString().slice(2)) || text.includes(poolSecret.toString().slice(2))}`)
  log("CHECK E9.2 attribute keys:", [...new Set(dump.flatMap((x) => Object.keys(x.attributes)))].join(", "))
  log("CHECK E9.3 span names:", [...new Set(dump.map((x) => x.name))].join(", "))
  writeFileSync("private-values-e2.json", J([...PRIVATE].map(String)))
  process.exit(0)
}
main().catch((e) => { console.error("RUN FAILED", e); process.exit(1) })
```

`/tmp/spike-noir/client/src/run-token.ts`
```ts
// Spike runner (not generated), STRETCH: a real private token transfer out of the pool.
// The pool (keyed contract) holds standard Token notes owned by its own address; a member's `spend_to` debits the
// shared allowance and calls Token.transfer_in_private(from = pool, ...) as the pool itself (no authwit).
import { Effect, Layer, Exit } from "effect"
import { EthCheatCodes } from "@aztec/ethereum/test"
import { TestDateProvider } from "@aztec/foundation/timer"
import { deriveKeys } from "@aztec/aztec.js/keys"
import { Fr } from "@aztec/aztec.js/fields"
import { TokenContract } from "@aztec/noir-contracts.js/Token"
import { RolePoolContract } from "./artifacts/RolePool.js"
import { AllowanceContract } from "./artifacts/Allowance.js"
import { RolePoolClient, RolePoolLive, Device, type RolePoolShape, type Role } from "./generated/rolePool.js"
import { connect, person, sponsored, type Person } from "./devices.js"

const log = (...a: unknown[]) => console.log(...a)
const J = (x: unknown) => JSON.stringify(x, (_, v) => typeof v === "bigint" ? v.toString() : v)

async function main() {
  const { node, sponsor, fpcInstance } = await connect()
  const fee = sponsored(sponsor)
  const A = await person(node, fpcInstance, "admin"), M1 = await person(node, fpcInstance, "m1"), R = await person(node, fpcInstance, "recipient")
  const F = await person(node, fpcInstance, "filler", { prove: false })

  const poolSecret = Fr.random()
  const { contract } = await RolePoolContract.deploy(A.wallet, { publicKeys: (await deriveKeys(poolSecret)).publicKeys } as any).send({ from: A.address, fee } as any)
  const pool = contract.address
  const poolInstance = (await A.wallet.getContractMetadata(pool)).instance
  for (const p of [A, M1]) { await p.wallet.registerContract(poolInstance, RolePoolContract.artifact, poolSecret); await p.wallet.registerSender(pool, "pool"); await p.wallet.registerSender(A.address, "admin") }

  const { contract: token } = await TokenContract.deploy(A.wallet, A.address, "PoolToken", "PTK", 18).send({ from: A.address, fee } as any)
  const tokenInstance = (await A.wallet.getContractMetadata(token.address)).instance
  for (const p of [M1, R]) await p.wallet.registerContract(tokenInstance, TokenContract.artifact)
  await R.wallet.registerSender(pool, "pool")
  log(`CHECK T1 pool ${pool.toString().slice(0, 12)}…, token ${token.address.toString().slice(0, 12)}… deployed (sponsored)`)

  // funding (out of scope as a policy; here: the admin mints to the pool privately)
  await TokenContract.at(token.address, A.wallet).methods.mint_to_private(pool, 1_000_000n).send({ from: A.address, fee, additionalScopes: [pool] } as any)
  const bal = async (p: Person, who: any, scopes: any[]) => {
    await (p.wallet as any).pxe.sync()
    return (await TokenContract.at(token.address, p.wallet).methods.balance_of_private(who).simulate({ from: p.address, additionalScopes: scopes } as any)).result
  }
  log("CHECK T2 pool balance seen by admin:", await bal(A, pool, [pool]), " by m1:", await bal(M1, pool, [pool]))

  const layerFor = (p: Person, role: Role) => RolePoolLive.pipe(Layer.provide(Layer.succeed(Device, { wallet: p.wallet, node, from: p.address, pool, role, sponsor })))
  const as = <X>(p: Person, role: Role, f: (c: RolePoolShape) => Effect.Effect<X, any>) =>
    Effect.runPromiseExit(Effect.gen(function* () { const c = yield* RolePoolClient; return yield* f(c) }).pipe(Effect.provide(layerFor(p, role))))
  const ok = async <X>(p: Person, role: Role, f: (c: RolePoolShape) => Effect.Effect<X, any>): Promise<X> => { const e = await as(p, role, f); if (Exit.isFailure(e)) throw new Error(`unexpected failure (${p.name}): ${J(e.cause)}`); return e.value }

  await ok(A, "admin", (c) => c.grant(10_000n))
  await ok(A, "admin", (c) => c.addMember(M1.address))
  const { contract: fillerC } = await AllowanceContract.deploy(F.wallet).send({ from: F.address, fee } as any)
  const eth = new EthCheatCodes(["http://127.0.0.1:8545"], new TestDateProvider())
  const ts = Number((await (node as any).getBlockData("latest")).header.globalVariables.timestamp)
  await eth.warp(ts + 3630); await fillerC.methods.naive_grant(R.address, 1n).send({ from: F.address, fee } as any)

  const r = await ok(M1, "member", (c) => c.spendTo(token.address, R.address, 4321n))
  log(`CHECK T3 m1 spendTo(recipient, 4321): prove ${Math.round(r.timings.proveMs)} ms (proving ${Math.round(r.timings.provingMs)}), total ${Math.round(r.timings.totalMs)} ms`)
  log("CHECK T4 balances: recipient sees own:", await bal(R, R.address, []), " pool seen by m1:", await bal(M1, pool, [pool]), " pool seen by admin:", await bal(A, pool, [pool]))
  log("CHECK T4b allowance after the transfer (m1 view):", J(await ok(M1, "member", (c) => c.read())))
  const over = await as(M1, "member", (c) => c.spendTo(token.address, R.address, 10_000n))
  log("CHECK T5 spendTo over the allowance ->", Exit.isSuccess(over) ? "UNEXPECTED" : J((over.cause as any).reasons?.[0]?.error))

  const rc: any = await node.getTxReceipt(r.txHash as any, { includeTxEffect: true } as any)
  const fx: any = rc.txEffect ?? (await (node as any).getTxEffect(r.txHash))?.data
  const s = J(fx)
  log("CHECK T6 public view of spendTo:", { noteHashes: fx.noteHashes?.length, nullifiers: fx.nullifiers?.length, privateLogs: fx.privateLogs?.length, publicLogs: fx.publicLogs?.length, publicDataWrites: fx.publicDataWrites?.length,
    poolVisible: s.includes(pool.toString().slice(2)), tokenVisible: s.includes(token.address.toString().slice(2)), m1Visible: s.includes(M1.address.toString().slice(2)), recipientVisible: s.includes(R.address.toString().slice(2)) })
  process.exit(0)
}
main().catch((e) => { console.error("RUN FAILED", e); process.exit(1) })
```

`/tmp/spike-noir/client/src/tips2.ts` (diagnostic for finding 14)
```ts
import { createAztecNodeClient } from "@aztec/aztec.js/node"
import { EthCheatCodes } from "@aztec/ethereum/test"
import { TestDateProvider } from "@aztec/foundation/timer"
const node: any = createAztecNodeClient("http://localhost:8080")
const eth = new EthCheatCodes(["http://127.0.0.1:8545"], new TestDateProvider())
const tips = async () => { const t = await node.getChainTips(); return `proven ${t.proven.block.number} finalized ${t.finalized.block.number}` }
console.log("before", await tips())
await (eth as any).mine(130)
await new Promise((r) => setTimeout(r, 15000))
console.log("after mining 130 L1 blocks", await tips())
```