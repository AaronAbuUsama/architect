# Spike: Noir private core

**Question.** Can an organisation's treasury, roles and monthly budgets live in private Aztec notes, without publishing its contract instance, while revocation invalidates an already proven spend?

**Answer.** **Yes with cooperative client delivery; no for the full promise as proposed.** The unpublished core runs with a real private Token, caller-based roles and per-member budgets. Once a revoke lands, an earlier spend is rejected immediately. But shared keys alone do not guarantee access to successor notes from a modified member client, and the public still sees metadata. Known-address discovery and outside RPC operators are additional privacy boundaries. The stronger private, always-revokable authority claim is not validated.

## What was tried

A small `PrivateCore` contract, a separate ordinary-transaction clock probe, and an Effect client. Every person has a separate wallet and PXE. The organisation has its own keyed address; its configuration, rights and token notes are owned by that address. Its instance is registered locally with each holder's PXE and is never published to the instance registry.

The independent author wrote the acceptance journeys and sixteen TXE checks first. Empty handlers compiled and produced fourteen semantic failures. The completed contract passes all sixteen checks. Two inherited calendar unit tests also pass. See [acceptance](evidence/acceptance.md), [empty-handler source](evidence/empty-handlers.nr.txt), [empty-handler output](evidence/empty-handlers.log), [conformance output](evidence/conformance.log), and [calendar output](evidence/calendar-tests.log).

The pinned stack is Aztec and all direct Aztec packages at 5.3.0, aztec-nr v5.3.0, nargo beta 25, Node 24.12.0, Foundry 1.4.1 and Effect 4.1.2. [Exact versions and source commits](evidence/versions.json) and the [npm lockfile](client/package-lock.json) are retained. The monorepo's aztec-nr source was compared with the separately tagged aztec-nr source and matched. Dependency manifests are rewritten to local paths only inside ignored tool checkouts.

All proofs and network operations run locally. No external wallet, credential, cloud resource or paid service is used. Fresh test secrets stay in ephemeral SDK stores and memory; their values are never printed or committed. The local network skips proof verification. Client proving is real; acceptance by a verifying network is **not tested**.

## What was found

1. **Validated: an unpublished organisation instance holds and transfers a real private token.** The generic class is published once. The admin privately initializes an instance whose address commits to its class, keys and initializer arguments. Other parties receive the instance and shared secret locally. The node reports no publicly registered organisation instance before initialization or after all operations. A separate issuer deploys the shared test Token publicly; the local network already supplies the public sponsor and protocol contracts. There is no public organisation constructor or instance publication. Token issuance/setup is public where the shared Token requires it; the inspected deposit is a private transfer of already minted notes, rather than a mint. See [contract](contracts/private_core_contract/src/main.nr), [network assertions](client/src/main.ts), [checks](evidence/checks.json), and [published class](evidence/class-publication.json).

2. **Validated: shared note keys do not grant admin authority.** Grant and revoke compare `msg_sender` with the admin in the immutable private configuration. A member holding the organisation key is refused when trying either operation. The admin consumes the member's organisation-owned right through that key. A direct token transfer attempted by the member around the core also fails. An outside PXE without the shared key cannot read the rights. Revocation leaves a private inactive tombstone and does not take away the old holder's read access. This proves key use with available witnesses, not malicious-client successor availability. See the independent [checks](contracts/private_core_test/src/conformance.nr) and [network results](evidence/checks.json).

3. **Validated: a committed revoke invalidates an earlier proof.** A member proves a spend and holds it. The admin revokes the current right. Submitting the held spend is refused as `NetworkRejected { reason: "Existing nullifier" }`. A fresh spend after sync is refused as `AllowanceNotMember`. This is immediate nullifier conflict detection, without a delayed public list or a special expiration. It assumes the admin has the current note witness so the revoke can be proved and land; it is not an unconditional availability guarantee. See [results](evidence/checks.json).

4. **Validated: the ordinary same-block race attempt is resolved at admission.** The sequencer is paused while both transactions are attempted. At equal priority fees, in both submission orders the first is admitted and the second conflicts before both enter the candidate block. The error also reports a replacement-fee threshold; fee-bumped replacement was not tested. With spend first, the original revoke loses; the admin syncs, re-proves and commits the revoke. With revoke first, the spend loses. Both transactions being forcibly admitted and then ordered inside one block is **not tested**. The report does not claim that happened. See exact admission errors and winning blocks in [race output](evidence/races.json) and [probe source](client/src/modules/probes/internal/races.ts).

5. **Validated: each member has a separate monthly budget and transfers are atomic with its update.** Member one spends 4,321 from a 10,000 right. Spending 10,000 more returns `AllowanceExceeded { remaining: 5679 }`. Member two's four spends total 410 against its separate 7,000 right; member one's spent total remains 4,321. The recipient holds 4,731 and the treasury 595,269 from a 600,000 deposit. Refusals leave the right and token balance unchanged. A non-member with the shared key, an admin without a right and a revoked member are refused. See [network source](client/src/main.ts) and [results](evidence/checks.json).

6. **Validated: the proof's anchor month determines the debit across midnight.** The spend anchored at 2026-11-30 23:30:17 UTC. Its proof completed before midnight on L1, and it landed at 2026-12-01 00:03:53 UTC. The ordinary control used the identical anchor timestamp and expiration; both lifetimes were 82,800 seconds, or 23 hours. The next spend using a new-month anchor resets that member's stored total on touch. The contract imposes no month-end expiration: it keeps the protocol's ordinary lifetime. This is anchor-month accounting, rather than inclusion-month accounting. An old anchor inside the ordinary validity window can therefore refer to the previous month; this is not a hard inclusion-time month deadline. See [clock output](evidence/clock.json), [retained boundary transaction](evidence/public-month-boundary.json.gz), and [clock probe](client/src/modules/probes/internal/clock.ts).

7. **Validated for the inspected operations: no plaintext organisation, party, private amount or role argument is exposed in the public payload.** The full effects and node-returned transaction, including its proof, are retained. Node-returned bytes are asserted equal to submitted bytes. The scanner checks all party addresses and field-width encodings in the serialized bytes, and amount leaf values rather than numeric byte-index property names. This is a concrete payload inspection, not a general anonymity proof. No operation enqueues a public call, public teardown or application public-state write. The one public write charges the sponsor's fee balance.

| Operation | Notes | Nullifiers | Private logs | Public logs | Public writes | Public calls | Class logs | Lifetime |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| deposit | 4 | 6 | 6 | 0 | 1 | 0 | 0 | 23 hours |
| grant | 1 | 2 | 1 | 0 | 1 | 0 | 0 | 23 hours |
| spend | 4 | 6 | 5 | 0 | 1 | 0 | 0 | 23 hours |
| revoke | 1 | 2 | 1 | 0 | 1 | 0 | 0 | 23 hours |

All four have zero L2-to-L1 messages. The single public write is the sponsor fee balance. The full fee values, ciphertext bodies/lengths, gas inputs, commitments, padding and proof bytes are retained in the snapshots.

 See [summary](evidence/public-view.json), the four compressed snapshots below, and the [decoded public kernel fields](evidence/public-decoded.json.gz).

8. **Validated for configured recordings; refuted for raw INFO safety: recording is deliberately narrower than raw SDK logging.** Each ordinary operation is one Effect span with request, sync, prove, submit and wait children. Private errors remain typed on the device. Recorded span names and attribute values use finite allowlists; failure causes are replaced before recording, and events, links and annotations carry no private payload. SDK log text is reduced to fixed source, level and redacted-message metadata. The final recording adapter retains no raw message text, only transient-input hit indexes for its audit. The test deliberately injects a private refusal payload and log message. The full run recorded 311 spans and 527 scrubbed SDK log records, with zero matches for 1,193 tracked encodings in either recording. Raw SDK messages matched 22 tracked encodings. That count includes some public identifiers; it is not 22 distinct private leaks. Source inspection independently confirms INFO-level registration messages contain private organisation and party addresses. See the [SDK logging evidence](evidence/sdk-log-evidence.md). The post-review adapter also rejects arbitrary numeric severity values and logs unexpected failures only as fixed categories; the targeted adversarial tests pass. Zero scan matches establish only absence of the tracked encodings; small generic numbers and every possible representation cannot be classified by substring matching. See [telemetry output](evidence/telemetry.json), [recorded spans](evidence/spans.json), [recorded library logs](evidence/library-logs.json), and [redaction tests](client/src/modules/telemetry/telemetry.test.ts).

9. **Validated: every party uses the shared sponsor while holding zero fee juice.** Every transaction uses `SponsoredFeePaymentMethod`. Public gossip identifies the sponsor as fee payer. The final public balance check confirms zero fee juice on every fresh party account. A production sponsor is **not tested**. See [measurements and final assertions](evidence/measurements.json).

10. **Refuted: private state means the public learns only that transactions happened.** Fees, timing, byte sizes, anchor and expiration, note and nullifier counts, ciphertext counts and lengths, commitments and nullifiers remain visible. The measured operation shapes and gas costs differ. They can fingerprint activity even though they contain no plaintext company, member or amount. Rejected competing transactions also expose a shared conflicting nullifier to the node that received them. Shared sponsorship hides individual fee balances; it does not provide transport anonymity. RPC query privacy, traffic correlation and IP anonymity are **not tested**. The validation deliberately calls `node.getContract(pool)`, which sends the organisation address to the chosen local RPC node. An outside RPC operator would see that query. These results establish chain/gossip privacy; a stronger promise needs an owned node or a separately proven query-private RPC path.


11. **Refuted by source: shared keys alone guarantee future admin revoke availability.** The current right delivery is unconstrained. A modified member prover can make its successor ciphertext invalid or undiscoverable while keeping the budget transition constrained. The shared key cannot recover an undisclosed note preimage, and revoke must read that current note first. The actual malicious-PXE exploit is **not tested**. The honest-PXE results and rejection after an already-landed revoke remain valid. See [pinned delivery evidence](evidence/delivery-risk.md).

12. **Source-established privacy limit: known-address discovery is different from literal address absence.** The selected Token API correctly constrains both change and recipient delivery, but the default non-interactive discovery mode is recognizable to an observer who already knows the recipient address. That watcher attack is **not tested** by this spike's byte scan. A constrained interactive mode needs additional setup and a separate shared-state availability argument; a mode switch is not a validated fix. See [delivery and discovery evidence](evidence/delivery-risk.md).

Public snapshots, all compressed JSON with exact submitted bytes:

- [Deposit](evidence/public-deposit.json.gz).
- [Grant](evidence/public-grant.json.gz).
- [Spend](evidence/public-spend.json.gz).
- [Revoke](evidence/public-revoke.json.gz).

Effects include revert code, transaction hash and fee, note hashes, nullifiers, L2-to-L1 messages, public-data writes, encrypted private logs, public logs and class logs. Gossip includes the transaction hash, public kernel inputs, Chonk proof, class-log fields and public-function calldata. Decoded inputs include the anchor header, chain/version and gas settings, expiration, fee payer, accumulated effects and any public call/teardown requests, including empty padding. The proof bytes and encrypted log bodies remain opaque; their sizes are public. The node-returned class record contains `id`, `version`, `artifactHash`, `privateFunctionsRoot` and `packedBytecode`. These are generic class data, rather than an organisation's private initializer inputs. This run publishes the class once as requested; whether the core can omit even that publication is **not tested**.

## Measurements

All times are milliseconds, shown as median / worst.

| Operation | Runs | Proving only | Prove step | Total |
|---|---:|---:|---:|---:|
| deposit | 3 | 8,707 / 10,768 | 11,184 / 14,087 | 14,113 / 17,131 |
| grant | 5 | 6,679 / 10,806 | 9,459 / 16,323 | 12,305 / 19,868 |
| spend | 6 | 11,913 / 17,627 | 17,558 / 28,029 | 22,274 / 33,373 |
| revoke | 3 | 8,910 / 20,443 | 12,739 / 45,939 | 16,477 / 53,501 |

Setup was sampled once: class publication took 15,242 ms total and private initialization 11,658 ms. Ordinary-control samples mix fast mock-proof clock fillers with one real-proof lifetime control; a proving value of minus one means unavailable for a mock control, not negative proving time. They are excluded from the operation table.


The generated bindings were normalized by the generator wrapper and reproduced byte-for-byte across two consecutive invocations; see [hashes](evidence/codegen-stability.sha256). The pending-conflict classifier and failure/log-severity sinks have targeted regression tests. No contract logic changed in these review repairs.

These are native CPU measurements on an ARM64 Mac with ten logical CPUs and 16 GiB RAM. The host also had other work running. Proving-only comes from PXE statistics. Prove-step includes private execution and proof generation. Total covers request through inclusion. Setup, ordinary clock transactions and deliberately held/racing proofs are kept separate; an intentionally held transaction's wall time is not mixed into ordinary operation latency. Every measured non-control operation asserts a positive native proving duration. Raw samples are in [measurements](evidence/measurements.json); aggregates are in [measurement summary](evidence/measurement-summary.json).

## The decision it supports

**Validated locally:** private organisation-owned notes and nullifier conflicts are useful primitives for a later Noir target's roles and budgets, with cooperative delivery. **Do not adopt this prototype as an always-revokable authority design.** Do not port the Solidity public role list. A shared read/nullifier key is separate from the caller's authority. Revocation means consuming the current right, with retry after a conflicting spend.

**Refuted:** a promise of no observable metadata, and a promise that revoke always beats a spend already admitted first. Neither should appear in generated documentation or client guarantees. The source also refutes an unconditional successor-witness availability promise for the current delivery mode.

**Not tested:** production readiness or a verifying network. This is a spike record, adds only this folder, and changes no package, layer gate or active build-plan step. The lead owns any later declaration or target work.

## Addendum update for the lead

The addendum's private account, shared ownership, private rights, per-member budgets, default-lifetime anchor-month accounting and sponsored local fees are validated with cooperative PXEs. Its stronger shared-key availability assumption is refuted by the selected unconstrained delivery mode. The public membership list and delayed revoke from E2 are unnecessary here. The private instance is initialized without public publication. Spend consumes the right and token notes together. Revoke consumes the current right and leaves a private inactive tombstone.

Three promises change. Shared keys do not guarantee delivery or availability of future note witnesses. "Instant" starts when the revoke lands; an earlier admitted spend can invalidate a pre-proved revoke. "Nobody outside sees anything" must become a statement about hidden identities, values and state, with public metadata listed explicitly. Key holders retain read access after revoke.

These are **proposed Architect declaration shapes**, not an implemented Architect API:

```ts
{
  visibility: {
    treasury: "private(organisation)",
    rights: "private(organisation)",
    arguments: "private(organisation)",
    refusalPayloads: "private(caller)"
  },
  custody: {
    holder: "organisation",
    key: { sharedBy: ["admin", "member"] },
    instance: "locally-registered-unpublished",
    class: "shared-publication",
    delivery: {
      integrity: "constrained-required-for-shared-mutable-state",
      discovery: "explicit-per-target",
      witnessAvailability: "must-prove-for-every-authorised-mutator"
    }
  },
  roles: {
    member: {
      membership: "private-right-note",
      authority: "caller-account",
      revoke: {
        consumes: "current-right",
        writes: "inactive-tombstone",
        takesEffect: "on-commit",
        availability: "requires-current-note-witness",
        onConflict: "sync-and-reprove"
      }
    }
  },
  spend: {
    runs: "client",
    steps: ["request", "sync", "prove", "submit", "wait"],
    fees: { payer: "sponsored" }
  },
  time: {
    reset: {
      every: "calendar_month",
      by: "replace-note-on-touch",
      basis: "proof-anchor",
      lateInclusion: "charge-anchor-month"
    },
    expiration: "protocol-default"
  },
  testKinds: ["target-unit", "network"]
}
```

The delivery fields above are proof obligations for a future generator. The current prototype does not satisfy that availability gate. Constrained interactive delivery has not been validated as a solution. A `check` step remains available for targets with public logic; this core does not need one. Telemetry needs finite name/value allowlists, failure-cause redaction and raw SDK message suppression, in addition to an attribute-name allowlist. INFO level alone is not safe for private identifiers. Time declarations must distinguish anchor time from inclusion time. A calendar reset need not use twelve public or private month slots: this core carries the month in each mutable right. No keeper, public time signal or short month-end lifetime is generated.

## Open risks

- **Refuted by source:** unconditional admin availability after a modified member's successor-note delivery. The actual malicious-PXE attack and a corrected delivery/handshake design are **not tested**. See [delivery evidence](evidence/delivery-risk.md) and [tracked follow-ups](follow-ups.md).
- **Source-established boundary; watcher test not run:** default non-interactive Token discovery can identify a recipient to an observer who already knows its address. Literal byte absence does not establish resistance to that observer.

- **Not tested:** acceptance and proof verification on a verifying local network, public testnet or production. The default local node does not verify proofs.
- **Not tested:** forced dual admission and sequencing of both conflicting candidates inside a single block. The ordinary local RPC refuses the second at admission.
- **Not tested:** replacement by a higher priority fee. The equal-fee race error advertises a minimum replacement fee.
- **Validated limitation:** a spend that wins admission can invalidate a pre-proved revoke. Revocation has no ordering priority. Clients must surface this and re-prove after sync.
- **Validated limitation:** revoked key holders retain read access. Rotation and migration are out of scope.
- **Not tested:** independent members spending concurrently from shared token notes. Their rights are separate, but token-note contention can still require re-proving.
- **Not tested:** RPC query privacy and transport/IP anonymity, malicious peer/PXE security, collusion, browser/mobile proving, production fee sponsorship, bridging, payroll, audit disclosure or version six.
- **Validated harness limits:** the TXE needed the organisation scope during its private initializer. Forge must be selected with `FORGE_BIN`; the SDK prefers a standalone installation before PATH. Long checkout-based temp paths exceed macOS Unix-socket limits. One batch of 130 L1 blocks can precede asynchronous synthetic settlement, so clock tests may need further batches before finality catches up. The corrected controller consults both L1 and L2 time, uses 22-hour steps, catches up finality four hours before month end, then uses short boundary steps without synthetic epoch settlement. The [clock rehearsal](evidence/clock-rehearsal.json) crossed midnight with ordinary mock-proof control transactions; the separate full scenario uses real client proofs. The [mining probe](evidence/mining-probe.json) showed that block-count mining itself did not advance time; asynchronous local settlement was the reason L1 could run ahead of the last L2 anchor. These limits are recorded in source and the failed-attempt evidence.

## Reproduce

From the repository root, with no other service listening on the local ports used by this spike:

```sh
bash spikes/noir-private-core/scripts/install.sh
bash spikes/noir-private-core/scripts/reproduce.sh
```

The install script writes pinned tools under the ignored `tools` folder, without changing a shell profile. Ordinary SDK/compiler caches and temporary stores use their normal system locations; generated source, commands and retained evidence stay in this folder. The reproduction script compiles, runs both test suites and the client checks, starts a fresh local network, runs all scenarios, decodes retained public transactions, writes measurements and stops its owned network processes on success or failure. No private key, raw SDK log message or private witness is written into retained evidence. Startup account output is discarded. The normal short OS temp path is required for native IPC.

For separate terminals:

```sh
cd spikes/noir-private-core
source env.sh
bash scripts/codegen.sh
cd client
npm run check
npm run network
# In a second terminal, source env.sh again, then:
npm run run
node --import tsx src/bin/inspect.ts
python3 ../scripts/measurements.py
# Stop the network terminal with Control-C.
```

[The supplied addendum](evidence/noir-addendum-for-lead.md) and [the two earlier reports](evidence/noir-evidence/) are retained unchanged. `design-study.md` is supplied background, not this spike's runtime evidence. [First clock-harness failure](evidence/clock-attempt1.json), [first attempt](evidence/attempt1.log), [byte-index scanner failure](evidence/attempt2.log.gz) and [temp-path failure](evidence/temp-path-failure.log), and [backward-warp failure](evidence/attempt3.log) are retained so the successful path does not hide failed experiments.

## TO THE CONDUCTOR

Answer: the core works locally with cooperative successor delivery. Public metadata remains visible; unconditional shared-key revoke availability is refuted by source. Preserve the distinction between a successful revoke invalidating old spends and an admin always being able to obtain the current witness. Support the later Noir target with shared private custody, caller authority and per-member notes. Refine the visibility, custody, runs, step-kind, telemetry and private-time declarations at their appropriate decision steps. Track NPC-01 through NPC-03 before promoting the stronger target promise. Change no active layer from this spike. Fold the addendum corrections into the later-target plan before generating a product promise.
