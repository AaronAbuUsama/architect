# Addendum for the lead: Noir on Aztec as a third target

From Aaron, 16 November 2026. Two code spikes ran the allowance on Aztec 5.3.0 (aztec-nr v5.3.0, aztec.js 5.3.0,
Effect 4.1.2, local network, client-side proving). Everything under "Validated" ran in code; Aaron's direction and the private core are proposals until the next spike proves them.
The full spike reports, with every source file and the commands to reproduce, are in `noir-evidence/`. This is a
**later** target: nothing here is built before its layer. Add it to `design/later.md`, and take the cheap layer-one
items at the end into decision step D2.

## Aaron's direction (16 November 2026, after the spikes)

1. **The promise that matters: nobody outside the organisation can see anything.** Leak as little as possible to the
   public. Inside the organisation, everyone seeing everything is acceptable for now; tighter internal privacy, when it's
   needed, comes later as a migration to a new key.
2. **Don't mirror the Solidity contract.** On Aztec, design from what is naturally private. The goal isn't one allowance
   contract but the smallest private building block that grows, layer by layer, into a private Capxul.
3. **So the role gate tested below (E2) is evidence, not the final design.** E2 kept its membership list in public
   state, which leaks membership changes (a member's marker and its timing) and, with a short revoke delay, a
   distinctive transaction lifetime. That leak existed only because internal parties didn't share a key. With internal
   visibility allowed, nothing needs to be public.

## The proposed private core (not yet validated; a spike is next)

- **A private organisation account:** the organisation's money is private notes owned by an account whose key everyone
  inside shares. The contract is never deployed publicly; its code is registered once and shared by every organisation,
  so it reveals no organisation.
- **Private roles as notes:** a member's spending right is a private note owned by the organisation ("this member may
  spend up to this much a month"). Who may act is still checked against each caller's own account, so sharing the key
  doesn't let a member act as the admin.
- **Spend** uses up the member's right note and writes a new one with the new total.
- **Revoke is instant and private:** the admin uses up the member's right note; from the moment that lands, any spend by
  that member is rejected, even one proven earlier, because the note it needs is gone. No delay, no public list.
- **Time with no signal:** the month is read from the proof's anchor block, with no expiration bound, so no spend ever
  carries a short lifetime. A spend made just before midnight on a month's last day may count in the old month.
- **Fees through a shared fee payer.**
- **What the public would see:** that transactions happened, through a shared fee payer, and that the contract's code
  exists. Not who, not which organisation, not how many members, not amounts, not membership changes.
- **To be proven by the next spike:** a contract that runs without ever being deployed publicly; the admin using up a
  member's note through the shared key; a revoke blocking a spend proven before it; the anchor-block month with no
  lifetime signal; shared fees; and, checked on chain, exactly what the public can see.

## The layers to a private Capxul (proposed)

1. A private organisation account: receive, hold and send privately.
2. Private roles: grant and revoke rights as notes.
3. Private budgets: monthly limits, spending, instant revoke.
4. Private payments and payroll, including to people outside the organisation, who receive privately.
5. Money in and out between Aztec and Ethereum: the one boundary where some leak is unavoidable (amounts at the bridge),
   so it needs care such as batching.
6. Disclosure and migration: read access for accountants and auditors; moving to a new key when internal privacy needs
   tightening.

End stage: a company's treasury, roles, budgets, payroll and payments live privately on Aztec. From outside, you see that
some transactions happened through a shared fee payer, and money crossing the bridge, nothing else. Architect generates
it from the blueprint with the validated primitives below.

## Validated (from the two spikes)

**1. The target pattern carries over.** `target-noir` generates, per thing: states and moves as constants; refusals as
coded assertion messages (`[AL-002] AllowanceCannotSpend { state }`); the machine as `can`, `is_edge` and `step`; a
calendar helper; the note type. A scaffold holds the storage and one private function per operation, with blanks only
for domain logic. Conformance tests run in Aztec's Noir test environment (TXE): every move from every state, data
refusals, the wrong caller. An Effect client is generated over Aztec's codegen artifact: one `Context.Service` per
thing, each operation one span. The compiled contract owns its artifact, as a Solidity contract owns its ABI.

**2. The E2 role gate works, with its public membership list (evidence, superseded by the private core).** Membership lives in `DelayedPublicMutable` state keyed by a salted marker
(`poseidon2(member, salt)`), read inside the private proof. Non-members, and the admin who isn't a member, are refused
(`AllowanceNotMember`). Adding and revoking a member both take effect only after the delay.

**3. A revoke bites at its scheduled time, even for a spend proven before it.** Reading delayed state makes the library
cap the transaction's lifetime at the earliest moment the membership could change; the rollup rejects it after that
(`Invalid expiration timestamp`). Measured: a member's spend proven ten minutes before the revoke expired at the change
time minus one second and was rejected; another member's spend from the same block was mined.

**4. The revoke delay is a privacy setting.** Aztec rounds each transaction's lifetime before it is published. A 24-hour
delay gives every spend the same lifetime as an ordinary transaction (23 hours), so spends are indistinguishable. A
1-hour delay gives every spend a 30-minute lifetime, and in the 30 minutes before a member's own scheduled change,
their spends show the exact change time, which links them to the pool. aztec-nr 5.3.0 has no minimum; the local network
needed more than 60 seconds (120 worked); version 6 imposes one hour.

**5. Custody: the pool is the contract's own keyed address.** The admin and members register the contract with its key.
All of them see the pool's amounts; only the admin sees who spent (that event is delivered to the admin only). Someone
without the key can neither read nor spend.

**6. Time on Noir, the rule.** A time move over private state is a guard on the next operation, never a transaction of
its own. It may rely on instants fixed at creation, on the anchor block's timestamp to show a moment has passed, on the
expiration bound to show a moment has not passed, and on nullifier uniqueness. It may not rely on reading the clock, a
keeper, mutable public state, or an event sent on chain. Monthly reset is a new slot per month; expiry is a guard on
the month index. Measured: a spend proven at 23:29 on the last day of a month and sent after midnight was rejected;
the next spend landed in the new month's slot.

**7. Tests need two kinds.** The TXE does **not** enforce a transaction's expiration (three probes landed past their
bound), so every time and revoke guarantee needs a test that runs on the local network.

**8. The client.** Each operation is one span with `request`, `sync`, an optional `check` (simulates the public part, so
public refusals come back typed), `prove`, `submit` and `wait`. Private refusals come back as typed errors decoded from
the prove error; a rejected transaction is `NetworkRejected`. Proving a spend: 6.4 s median, 6.7 s worst; the whole
operation 10.3 s median (4 vCPU, no GPU). With a real token transfer: 16.4 s.

**9. Fees.** Every party paid through the sponsored fee contract without holding the fee token; the public sees the
shared sponsor as payer.

**10. Telemetry.** 146 recorded spans and 421 library log lines contained none of 31 tracked private values. Spans use
an attribute allowlist with the outcome tag only.

**11. A real private token transfer out of the pool works** (the pool calls the token contract as itself, no authwit).

**12. The world clock can drive the local network:** `EthCheatCodes.warp(t)` in steps under 23 hours, each followed by
a block, then about 130 L1 blocks so L2 finality catches up.

## The primitives, in Architect's terms

- **`visibility`** on fields, events, operation arguments and refusal payloads: `public`, or private to a list of roles
  (`private(pool)`, `private(admin)`). Solidity is the case where everything is public. Validated.
- **`runs`** on operations: `client`, `server` or `chain`. Private Aztec operations run on the caller's device; the
  server never sees their inputs. Validated.
- **Step kinds `sync`, `check` and `prove`**, each a span with its own budget. Validated.
- **`custody`** on a thing: who holds its key (`holder: "pool"`, `key: shared(admin, member)`). Validated.
- **Role membership in delayed public state**, and **`takesEffect`** on membership moves (`revoke: { takesEffect:
  "after 24 hours" }`); the generator rejects delays below one block time plus proving, and warns under 23 hours.
  Validated.
- **Time moves on Noir**: `reset: { every: "calendar_month", by: "slot" }`, `expire: { after: "12 months", by: "guard" }`;
  no keeper. The clock primitive declares, per target, what time a target can trust. Validated.
- **`fees: { payer: "sponsored" }`** on operations. Validated for the local network only.
- **A `network` test kind** beside the target's unit tests, for guarantees its test environment can't enforce. Validated.
- **Kits**: a `std/aztec` kit wraps aztec.js, the private execution environment, sponsored fees and the clock controls,
  as the chain kit wraps viem. Proposed, not built.
- **`signedBy` maps** to the caller's own Aztec account proving the call; Aztec accounts are already smart accounts.
  Proposed, not separately tested.
- **The nine evals** carry over from client-side spans; "on time" is checked as guards in network tests rather than as
  keeper lateness. Proposed.

## Not validated (kept apart)

- A revoked member keeps the pool key and can still read the pool; key rotation was not tested.
- Two members racing in one month (the loser is rejected and must re-prove) was not re-tested.
- A production fee payer; proof verification (the local network doesn't verify proofs); browser or mobile proving;
  version 6 behaviour; bridging money from Ethereum; the instant (public-check) flavour of the gate.
- Pool funding policy: how far ahead, and who tops it up. Aaron's decision.

## Cheap things to add to layer one now (decide in D2)

1. `visibility` on every field, event, argument and refusal payload, defaulting to `public`.
2. `runs` on every operation, defaulting to `server`.
3. Telemetry as an attribute allowlist in every target, outcome tag only, no values.
4. Refusal codes in a format stable across targets: `[AL-002] Name { field: value }`.
5. The operation step list open to new kinds (`sync`, `check`, `prove`).
6. A test kind marker, so a target can say a guarantee needs a network test.
