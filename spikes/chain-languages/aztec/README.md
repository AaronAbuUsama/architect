# Spike: the mini DAO on Aztec / Noir

Throwaway spike, one third of `chain-languages` (siblings: `../evm`, `../solana`). Nothing here is imported by a
package. Everything ran on this Mac against a local Aztec network; no cloud, no testnet, no key written anywhere.

## Question

Can the shared mini-DAO blueprint (`../spec.md`) be emitted as an Aztec contract in the shape a generator would
produce, and what does that say about Orthograph's chain design: the operation to function mapping, outside
contracts, refusal codes, what "confirmed" means, and whether the local network proves anything about client proofs?
The eight shapes of the spec (Q1 to Q8) are answered below, with Q7 (local proof verification) as the main new
evidence.

## What was tried

- `contracts/governance_contract/` (131 + 20 lines of Noir), built on the stock `private_voting_contract` (a
  `SingleUseClaim` nullifier per voter, an enqueued public tally).
  - Public admin operations: `open_proposal(proposal, digest)`, `close_proposal(proposal)`. Public `get` view.
  - Private membership: `add_member(member)` inserts a private `MemberNote` owned by the member into a `PrivateSet`.
  - Private `vote(proposal, choice)`: reads the caller's own `MemberNote`, claims `vote_claims[proposal][caller]`
    (a nullifier keyed by the caller's secret), enqueues `_tally` (only_self, public: checks the proposal is open,
    increments, emits `VoteCast { proposal, choice, yes, no }`, no voter in it).
  - Helpers: an `#[internal("public")]` `_assert_admin`, two `#[external("utility")]` views `is_member`/`has_voted`.
    Undeclared: public `rewrite_digest`.
  - Types: `ProposalId` and `Digest` are `Field` (the digest is `sha256ToField(revision body)`), `Votes` is `u32`,
    `choice` is a `bool` (true = yes), proposal state is a `u8` (0 absent, 1 open, 2 passed, 3 failed).
- Pinned stack, unchanged from the prior Noir spike (`versions.json`): Aztec 5.3.0, aztec-nr v5.3.0, nargo
  1.0.0-beta.25, Node 24.12.0, Foundry 1.4.1. Tools live in the git-ignored `tools/`; the Aztec compiler also caches
  verification keys in the user-level `~/.bb/5.3.0`. Nothing was upgraded, so the three-day rule is met by the old pins.
- One wallet and one PXE per actor (six, ephemeral), initializerless Schnorr accounts (no deploy transaction), the
  shared SponsoredFPC paying every fee.
- Scripts: `client/src/bin/*.ts` (one per question), `client/src/lib/` (`world.ts`, `decode.ts`), `scripts/`.
- All timings come from a 10-core Mac shared with two other spikes; treat every number as noisy.

## What was found

Each finding is marked **validated**, **refuted** or **not tested**.

### Q1 surface

1. **Validated: the artifact classifies cleanly, once you read two lists.** `loadContractArtifact` folds every
   public function into one `public_dispatch` entry; the real ones ride in `nonDispatchPublicFunctions`. A classifier
   that reads only `artifact.functions` sees three of the four public operations missing (first run of
   `classify.ts`). Over both lists, against the blueprint: `add_member`, `vote`, `open_proposal`, `close_proposal` are
   **operations**; `get` is the **declared read**; `_tally` (only_self), `is_member`, `has_voted` (utility) are
   **helpers outside the surface**; `rewrite_digest` is **undeclared**; `public_dispatch`, `sync_state`,
   `offchain_receive` and the `constructor` initializer are protocol or deploy-time. `_assert_admin` (`#[internal]`)
   is inlined and absent from the artifact. See [classification](evidence/q1-classification.json),
   [table](evidence/q1-classification.txt), [classifier](client/src/bin/classify.ts).
2. **What the artifact carries that an EVM ABI does not:** the visibility class per function (`private` /
   `public` / `utility`, from `custom_attributes`: `abi_private`, `abi_public`, `abi_utility`), `abi_only_self`,
   `abi_view`, `abi_initializer`, the 4-byte selector (computed from name and parameter types), a verification key
   per private function, and an `error_types` table mapping a u64 hash to every assert message string, so the
   `[AR-001] NotAllowed` and `[PR-002] ProposalExists` strings are readable from the artifact
   ([errors per function](evidence/q1-artifact-errors.json)). **What it does not carry:** whether a non-view public
   function actually mutates state (only `abi_view` is marked, so `rewrite_digest` looks like `open_proposal`), who
   may call it (the role check is in the body, not the ABI), the formatted-error template (a `f"..."` assert is only
   an item type list and a length, so `[PR-900] ProposalNotOpen { state }` is not in the table), and event schemas
   beyond field names. The generated TS binding also drops `#[only_self]` functions (no `_tally` method) while the
   runtime artifact still has it.
3. **Validated: unlike an EVM, the interface leaks nothing about who called, but also says nothing about who
   may.** A generator must emit the role check into the body and the table of allowed callers separately.

### Q2 someone else's contract

4. **Validated: the stock `Token` is readable from outside through its own artifact.** A third party deploys it
   (`TokenContract.deploy`), mints publicly and privately; an outside reader with no accounts of its own registers
   the instance + artifact in its PXE and reads `balance_of_public` (95), `total_supply` (140), `get_admin` with
   `simulate({ from: NO_FROM })`. [Output](evidence/q2-token.json), [adapter](client/src/bin/q2-token.ts).
   **What an outside reader cannot see:** Alice's 40 privately minted units (reader's PXE returns 0; the issuer's own
   PXE also returns 0 even though it minted them), who sent or received private transfers, any `Transfer` event
   (zero public Transfer events: the token emits it only as a private event delivered to the recipient). Every PXE
   that touches the token must be told its instance and class first: a PXE that was not got
   `No artifact registered for contract class ...`.
5. **Validated: refusals from someone else's contract arrive with no code of ours.** `transfer_in_public` of
   100000 against a balance of 95 raised `SimulationError: Assertion failed: attempt to subtract with overflow
   'self - other'`: an unstructured string, no selector in the artifact's error table for a typed class.
6. **Not tested: gating `vote` on holding the token privately.** What it takes, from source
   (`tools/aztec-packages/noir-projects/noir-contracts/contracts/app/token_contract/src/main.nr`): private balance
   is notes owned by the Token contract and only Token's own private functions can read them;
   `balance_of_private` is a `#[external("utility")]` (line 490, unconstrained, device-local, unusable from another
   contract's private function). The only private entry points that touch the holder's notes are `transfer` (line
   212) and `transfer_in_private` (line 271, `#[authorize_once("from", "authwit_nonce")]`, so another contract
   calling it needs an auth witness from the member). A "hold one unit" gate is therefore either (a) consume one unit
   into an escrow the DAO controls via an authwit-backed private call, which spends the holding rather than proving
   it, or (b) have the admin check holdings off-chain and issue the `MemberNote`, which is today's design. A
   read-only private proof of balance does not exist in the stock Token; it would need a new function in the token.

### Q3 signer versus submitter

7. **Validated: the member's own PXE proves, a keyless relayer can submit.** The member's PXE proved
   `vote` in 5.6 s (4.5 s of that is the client proof; 195 KB tx, 112 KB proof). The serialized bytes were handed to a
   separate `createAztecNodeClient` with no wallet, no PXE and no key; `node.sendTx` accepted them in 67 ms. The node
   cannot tell who proved. [Run](evidence/q3-q6.json), [script](client/src/bin/q3-q6.ts).
8. **What is visible in the submitted tx:** the fee payer (the sponsor), two nullifiers, zero note hashes, one public
   call request whose calldata is `[_tally selector, proposal, choice]` (the **choice is public**, the voter is
   not), the anchor block number, the expiration timestamp, gas limits, and the sizes. No `from`, no signature, no
   account address: the account entrypoint ran inside the private kernel. The relayer sees all of that; so does the
   mempool. Timing (and an IP, if the relayer is not trusted) remain linkable.
9. **Validated: sponsored fees work for members that hold no fee juice**, and a reverted transaction still charged
   the sponsor (fee 7.28e12 for a reverted vote against 7.98e12 for a successful one).
10. **What `submission.confirmed` can mean.** Receipt statuses seen (5.3.0 `TxStatus`: `dropped`, `pending`,
    `proposed`, `checkpointed`, `proven`, `finalized`): `pending` at 68 ms after submit, `proposed` at 2.29 s,
    `proven` at 2.57 s (the local network proves epochs synthetically, so `checkpointed` came and went inside one
    100 ms poll), and `finalized` never within 240 s: the chain-tip report right after was
    `{ proposed: 47, checkpointed: 47, proven: 47, finalized: 15 }`, i.e. finalized trailed by about 32 blocks. See
    [timeline](evidence/q3-q6.json). Recommendation: `confirmed` = `proven` for locally and for tests,
    `finalized` for anything a ledger or an external promise depends on; and a `mined`/`proposed` level exposed
    separately. Two things make plain "mined" unsafe: (a) a tx can be mined and **reverted** (finding 17), and (b) the
    forced rollback in finding 21 returned a block with status `proven` to `pending` or `dropped`.

### Q4 state

11. **Validated: where each fact lives.**
    - Proposal state, digest, tally: public storage, readable by anyone from a node (`getPublicStorageAt`, map slot
      from `deriveStorageSlotInMap`; raw words `1`, `0x1092` (= digest 4242), `1` read back), or through the `get`
      view with no PXE registration at all (a public static call is served by the node: an unregistered wallet read
      `get` fine).
    - Membership: a private note per member, owned by the member, delivered to them in an encrypted private log by
      the admin. The public sees one `add_member` tx with 2 note hashes, 2 nullifiers, 3 private logs and no public
      logs (the member is not in any of it). The **admin** knows the member list (it created the notes); a member
      knows only their own.
    - One-use claim: a nullifier = hash(member's app-siloed nullifier key, storage slot of `vote_claims[proposal]`,
      owner). Public in the sense that it sits in the nullifier tree, unlinkable to the member without their secret.
      `vote` effects: 0 note hashes, 2 nullifiers (the tx's first nullifier + the claim), 0 private logs, 1 public
      log (`VoteCast`), 5 public data writes (tally and fee). [Effects](evidence/q4-state.json).
12. **What the client must hold:** the Governance address, instance and class registered in its PXE (the artifact
    is bundled); its own account keys; the member's notes live only in that PXE. A second device with the **same
    account keys** and an empty PXE saw `is_member = true` and `has_voted = true` on the first utility call with no
    explicit sync and without registering the admin as a sender, in 628 ms in total (utility calls sync the
    contract's state on demand in 5.3.0). So "sync first" is done by the SDK, but a device that does not have the
    secret cannot reconstruct membership. An outsider cannot even ask "did X vote?": `has_voted(proposal, X)` from
    another PXE failed with `Public keys not registered for account` (and with the keys registered it would still
    need X's nullifier key). Validated.

### Q5 refusals

13. **Validated: what the TS client receives, per refusal** ([raw capture](evidence/q5-refusals-raw.json),
    [decoded](evidence/q5-decoded.json)). Simulation is `wallet` pre-flight (private on device, public in the node's
    AVM); the node's admission check runs at `sendTx`.

    | Refusal | Where it surfaces | What arrives | Decodes to |
    |---|---|---|---|
    | non-admin `open_proposal`/`close_proposal` | simulation (public part) | `SimulationError: Assertion failed: [AR-001] NotAllowed '<source text>'`, `revertData` = one field, the u64 selector of the string | `NotAllowed` AR-001 |
    | non-admin `add_member` | simulation, **on the device** (private) | same string, `revertData` empty | `NotAllowed` AR-001 |
    | non-member `vote` | simulation, on the device | same string, from the member-note read, **before** the proposal is looked at | `NotAllowed` AR-001 |
    | `open` twice | simulation (public) | `[PR-002] ProposalExists` | `ProposalExists` PR-002 |
    | `vote`/`close` on absent or closed | simulation (public) | `[PR-900] ProposalNotOpen { state: 0 }` (0 absent, 2 passed, 3 failed) | `ProposalNotOpen` PR-900 + state |
    | second `vote`, by simulation | simulation | `Error: C++ simulation failed: AVM simulation failed: [R_NULLIFIER_INSERTION] UNRECOVERABLE ERROR! Nullifier collision ... siloed nullifier 0x..`; it is not a `SimulationError` | `AlreadyVoted` PR-001, but only because op is `vote` |
    | second `vote`, sent without simulating | `node.sendTx` | `Error: Invalid tx: Existing nullifier` | same |
    | second `vote` while the first is pending | `node.sendTx` | `Nullifier conflict with existing tx 0x.. Minimum required fee: 1, got: 0` (carries the pending tx hash) | same |
    | public refusal after proving | block inclusion | tx **mined and reverted**: `waitForTx` throws `Transaction 0x.. reverted: reverted. Reason: unknown`; the receipt has `executionResult: reverted`, `revertCode: 1` and **no reason** | `NoCodeOfOurs` (re-simulate to find out) |

    The decoder ([`decode.ts`](client/src/lib/decode.ts), 29 lines) takes `(op, error)`. It matches
    `[(AR|PR)-nnn]` against the table, reads `state: n` out of the PR-900 text, and recognizes the three nullifier
    texts as `AlreadyVoted` only when `op` is `vote`.
14. **Validated: a second vote is refused at simulation, not at the node, if the wallet simulates first;
    the node refuses it at `sendTx` otherwise.** The pre-check that gives a typed `AlreadyVoted` without a failed
    simulation is the `has_voted(proposal, member)` utility: it runs on the member's device, answers from their own
    nullifier key, and is what the cross-check (finding 26) uses.
15. **Validated: the vote on a proposal that closes between prove and send is an included-but-reverted tx, and the
    claim does not stick.** A vote proven while the proposal was open, sent after `close_proposal` was mined: the node
    accepted it at admission (admission does not run public code), the sequencer included it, the public part
    failed. The tx is mined with `executionResult: reverted`, the sponsor was charged, and `has_voted` afterwards
    returned `false` (the revertible nullifier was dropped), so the member may vote again on a proposal that is
    still open. The same shape appeared for a duplicate `open_proposal`.
16. **Refusals that arrive with no code of ours** (found, not caused by a bug): the `only_self` guard
    (`Function _tally can only be called by the same contract`), Token's `attempt to subtract with overflow`,
    `Contract 0x.. is not deployed`, `No artifact registered for contract class`, `Public keys not registered for
    account`, `Tried to create a Fr from an invalid string` (a client TS error before anything is sent), the AVM
    nullifier collision before our decoder names it, `Invalid tx: Invalid proof`, `Invalid tx: Incorrect calldata for
    public call`, `dropped`, and every mined-but-reverted tx.
17. **What makes a code unstable on Aztec** (analysis from the evidence, not a repro of each):
    - The code is a literal in an assert. Renaming the text changes the u64 selector in `error_types` and nothing
      else; clients match on `[PR-001]`, so a rename of the **name** is free and a rename of the **code** is a
      breaking change. A reorder of blueprint declarations changes codes only because the generator derives them from
      order: the chain does not know.
    - `PR-001` is **not on the chain at all**. It is a client-side name for "a nullifier collided on `vote`".
      Nothing in the artifact lists it, so a drift between a generated client and an old contract cannot be
      detected from the ABI.
    - The formatted message (`ProposalNotOpen { state: n }`) is parsed out of free text. A field added or renamed in
      the f-string silently loses `state` in the decoder.
    - The simulation error message embeds the failing assertion's **source text**
      (`'assert(state == OPEN, f"[PR-900] ...")'`); matching the full message instead of `originalMessage` can
      false-match a code that only appears in someone's source line.
    - An identical resend of an already-mined vote returns the same `Existing nullifier` text as a real
      second vote; text cannot tell them apart (the decoder labels both `AlreadyVoted`; `has_voted` disambiguates).
    - A reverted tx has no reason, so its code is lost; the follower needs the tx hash plus a re-simulation, and
      state may have moved.

### Q6 events and confirmation

18. **Validated: a follower with no wallet reads `ProposalOpened` and `VoteCast`** with
    `getPublicEvents(node, GovernanceContract.events.X, { contractAddress, fromBlock })` (decoded from the public logs
    by the artifact's event metadata; each event carries `l2BlockNumber`, `l2BlockHash`, `txHash`, `contractAddress`).
    `VoteCast` carried `{ proposal, choice, yes, no }` and no voter. [Run](evidence/q3-q6.json).
19. **Validated: the publishing link.** `digest = sha256ToField(body)` is a `Field`; the follower matched the on-chain
    `ProposalOpened.digest` to the hash of the stored revision body (`digestMatchesRevision: true`). The Field is
    the reduced hash, so the stored revision must keep the same reduction rule, and a 256-bit digest does not fit
    losslessly: two bodies that collide after reduction are possible in theory (the reduction is modulo the field).
20. **Validated: confirmation levels.** See finding 10. The follower's rule for the publishing link: read the event,
    then wait until `receipt.status` is at least the chosen level and `blockHash` still equals the event's.
21. **Validated for rollback, with an unexplained inconsistency.** `rollbackTo(n)` through the node admin API
    (port 8880) can be forced locally. [Probe](evidence/q6b-rollback-back5.json), [first
    observation](evidence/q3-q6.json), [one-block variant](evidence/q6b-rollback-back1.json). Rolling back five
    blocks: the block with the `ProposalOpened` and everything after it vanished, the `proposed` tip bounced
    210 to 209, the tx's receipt became `dropped` (never re-queued, not re-mined by later activity), the event
    disappeared from `getPublicEvents`, and a contract deployed in the rolled-back range was reported as `not
    deployed`. The `finalized` tip (182) did not move. A one-block rollback inside the `proven` range: in the first
    run the tx returned to `pending` and stayed there 18 s while the next fresh deploy failed `Contract ... is not
    deployed` (the network needed a restart); in the second run the tips were back at the old head within 1 s and
    the tx still `proven` (the block was re-imported from L1). I could not explain the difference. For a follower: an
    event seen at `proposed`, `checkpointed` or `proven` can disappear; only `finalized` has not been seen to move.
    **Not tested:** the real cause of a prune on a live network (an epoch's proof not landing within its submission
    window); the local network settles epochs synthetically (`automineEnableProveEpoch`), so a real proof-window
    prune cannot be forced here.

### Q7 local world and proof verification

22. **Validated: the stock local network does not verify client proofs and cannot be told to from the CLI.**
    `aztec start --local-network` (startup 26.4 s in this run, [start](evidence/q7-start-cli-network.txt)) builds its
    node through `createLocalNetwork({ l1Mnemonic, l1RpcUrls, testAccounts })` only
    (`client/node_modules/@aztec/aztec/dest/cli/aztec_start_action.js:24-28`) and hard-defaults
    `realProofs: config.realProofs ?? false` (`dest/local-network/local-network.js:104`), ignoring
    `PROVER_REAL_PROOFS` from the environment. Node and its log: `Aztec node is accepting fake proofs`. With
    `realProofs` false the node builds `TestCircuitVerifier` for both the RPC and the peer verifier
    (`@aztec/aztec-node/dest/factory.js:148-158`), whose `verifyProof` returns `valid: true` for every tx
    (`@aztec/bb-prover/dest/test/test_verifier.js:6-22`). The RPC path skips even that only for simulations
    (`aztec-node/dest/aztec-node/server.js:923`).
23. **Refuted: the nearest knobs on the CLI network.**
    - `DEBUG_FORCE_TX_PROOF_VERIFICATION=true` (`aztec-node/dest/factory.js:148`) makes the node use the real
      verifier, but the local network then aborts on its own startup: its setup transactions are made with mock
      proofs (`local-network.js:165`, `proverEnabled: aztecNodeConfig.realProofs`) and the node rejects them with
      `Invalid tx: Invalid proof`. Without `BB_WORKING_DIRECTORY` it aborts earlier
      (`bb-prover/dest/verifier/bb_verifier.js:92-95`). [Evidence](evidence/q7-start-forced-verification-fails.txt).
    - The admin `setConfig({ realProofs: true })` changed what `getNodeInfo()` reports (`realProofs: true`), took 8
      ms, and the node's source says it swaps the verifiers (`server.js:980-991`), yet tampered proofs were still
      accepted and no verifier start-up log line appeared; the swap was **not observed to work** and I did not find
      why. [Run](evidence/q7-cli-setConfig-toggle-on.json). Do not rely on it.
24. **Validated: the working way is in process, `setupLocalNetwork` from `@aztec/aztec/testing`** (the same
    `createLocalNetwork` code path the CLI uses, with `testAccounts: false` and caller-chosen `realProofs`; source in
    `node_modules/@aztec/aztec/src/testing/local-network.ts`). Needs `bbBinaryPath` and `bbWorkingDirectory` in the
    config, and every account that must pay fees pre-funded at genesis with fee juice (so there is no sponsored FPC
    here; accounts pay for themselves). The node is then an in-process object, passed straight to the wallet.
    Network start was **4.9 s with verification on, 1.0 s with it off** (in process; versus 26 s for the CLI
    network). Same flow, same code, same harness ([run](evidence/q7-inprocess.json),
    [script](client/src/bin/q7-inprocess.ts)):

    | Submitted to `sendTx` | verification ON | verification OFF |
    |---|---|---|
    | honest vote, real client proof | accepted (79 ms to admission, 2.3 s to mined), tally 1 | accepted (27 ms), tally 1 |
    | one proof field element changed (+1 at `fields[300]`) | **rejected** `Invalid tx: Invalid proof` (34 ms) | **accepted and counted** (tally 3) |
    | empty proof (what a mock-proof PXE emits) | **rejected** `Invalid tx: Invalid proof` (16 ms) | accepted and counted |
    | random proof bytes | **rejected** `Invalid tx: Invalid proof` (22 ms) | accepted and counted |
    | public calldata edited (choice changed), proof untouched | rejected `Incorrect calldata for public call` | rejected, same (an always-on data check) |
    | 4 bytes flipped in the serialized (compressed) buffer | accepted | accepted |

    The last row looks like a failure but is not a proof tamper: the bytes sit in the compressed carrier and the
    decoded `fields` are identical (checked by comparison), so verification had the same proof in front of it.
    Verification costs roughly +50 ms at admission per transaction (79 versus 27 ms); the proof-field tamper cost
    34 ms to refuse. A first attempt on the CLI network is kept for the record ([off
    baseline](evidence/q7-cli-network-off.json)).
25. **What was and was not verified.** Verified on the verifying node: the client IVC proof of the private part of
    every submitted tx at RPC admission, plus the always-on structural checks (data/calldata hash, double spend,
    expiry, gas, metadata). **Not verified, and not tested:** the node's gossip path (`BatchChonkVerifier` on peers;
    no p2p here), epoch proofs and rollup verification on L1 (the local network settles epochs synthetically; a real
    rollup proof was never produced), and proving or verification speed on a quiet machine.

### Q8 cross-check

26. **Validated, with one ordering difference that a generated client must close.** For each seed in `SEEDS`, the
    same `sequence(seed, n)` ran through `../reference.ts` and through the contract, comparing ok/refusal, code,
    `ProposalNotOpen` state, and `yes`/`no`/`state` after every successful step. Mapping: actor index to its **own
    wallet and PXE** (six PXEs; one PXE with six accounts would let one device see every member's notes and nullifier
    keys, which defeats the privacy the chain is chosen for); `member.add` to `add_member`; the admin is actor 0.
    - **Real proofs**, 5 seeds x 40 steps = 200 steps, 71 transactions proved and sent, 112 to 214 s per seed
      (about 3 min), [seed files](evidence/q8-real-seed1.json): **0 divergences** when the client runs the
      reference-order pre-check (`is_member`, then `get`, then `has_voted`). With raw decoding only (simulate, then
      decode) **7** divergences, all the same: a member who already voted votes again on a **closed** proposal;
      the reference says `ProposalNotOpen {failed}` (PR-900), the chain says `AlreadyVoted` (PR-001), because the
      nullifier collision happens before the public machine check is reached.
    - **Mock proofs** (PXEs not proving; node with verification off), 3 seeds x 300 steps, 4.5 to 5.1 min per seed,
      [seed files](evidence/q8-mock-seed42.json): 119 transactions, 0 divergences with the pre-check, 126 raw-decode
      divergences, all of the same kind.
    - Why these sizes: each successful private step is a ~5 s client proof plus ~2.5 s to mine, a refusal costs
      about 0.3 s, so 40 steps is 2 to 3.5 minutes. The sequences are refusal-heavy (the generator closes proposals
      quickly), so only 9 to 17 of 40 steps succeed.

## The decisions it supports for Orthograph's chain design

- **Operation to function mapping (Aztec target).** One external function per operation. The *visibility* is a
  per-operation declaration the blueprint does not have yet: `membership` operations and `vote` are `private`;
  admin and machine transitions are `public`; a read is `public view` or `utility`. A `vote` is a **pair**: a private
  entry plus an `only_self` public continuation the generator emits (the stock voting contract shape), so the body of
  the operation spans two functions and its refusals split across two layers (device and block). The generator
  should emit the pair, mark the continuation as outside the surface, and keep a table of both.
- **What clients may call.** Operations (private functions: through the member's own PXE; public ones: any wallet),
  declared reads (public view via the node, no registration; utility via the device), and nothing else. The
  classifier in `classify.ts` is the check: any non-protocol entry outside {operations, declared reads,
  only_self, utility} is `undeclared` and must be reported. Note `rewrite_digest` looks exactly like an operation in
  the ABI (no mutability bit), so declared-versus-undeclared needs the blueprint list; the artifact cannot decide.
- **Order of checks differs from the effect wrapper's.** Role, then machine, then body is the reference order. On
  Aztec role (membership) is checked first on the device, then the claim, then the machine state last in the block.
  The generated client must run the three checks in the reference order against device-local utilities (`is_member`,
  `get`, `has_voted`) before sending; this closed every divergence we found.
- **How outside contracts come in.** By instance + artifact registered in each PXE, typed from the artifact. Public
  reads work through the node with no registration; private state of an outside contract is invisible to anyone
  but its owners, and its refusals have no codes. A "member holds a token" gate is not a reading: it is either an
  authwit-backed private spend or an admin decision. The blueprint's adapter for outside contracts should expose
  public reads and public events only, and mark private reads as "device-local".
- **Refusal codes on Aztec.** Our codes ride in assert messages and are readable from the artifact's error table
  (PR-002, AR-001; PR-900 only as formatted text). AlreadyVoted (PR-001) is a **client-side name for a nullifier
  refusal**, valid only for the `vote` operation, and it arrives from three different layers with three texts. The
  decoder needs `(op, raw error)`. A generator must emit the decoder's table and the has-voted pre-check.
- **What `confirmed` means.** `finalized` (never `mined`) for anything outward-facing; `proven` locally. A mined tx
  can be reverted with no reason, and a rollback returned a `proven` block to `pending`/`dropped`. A `submission`
  state machine should have `proven` (revert-checked) and `finalized` as separate steps and treat a `reverted`
  result as a refusal of unknown code that needs a re-simulation.
- **Local proof verification.** Declare it a **separate test mode**: the default local network, and therefore every
  test that uses `aztec start --local-network`, accepts any proof. The harness that proves anything about proofs is
  the in-process `setupLocalNetwork` with `realProofs: true`. A `check` that claims "a bad proof is refused" must
  run there. Mock-proof PXEs are fast and fine for logic cross-checks (finding 26), but they cannot be used to
  claim the contract is safe against a forged proof.

## Open risks

- Rollback behaviour is unexplained (finding 21): two runs of a near-identical probe disagreed.
- The admin `setConfig({ realProofs })` toggle did not take effect in our run (finding 23); it may be a bug in our
  invocation or in 5.3.0.
- The vote's `choice` is public (calldata), and membership is only private against the public: the admin knows the
  member list, and timing and tally increments let an observer infer who voted when few members vote. The
  `SingleUseClaim` docs say the same.
- `ProposalId`/`Digest` as `Field` loses the 32-byte digest's top bits (the reduction), and a sha256 digest is
  not a native Aztec hash; poseidon2 would be cheaper in a circuit but is not what a D1 revision would use.
- Admission accepts a tx that will revert in the block (finding 15). The revert drops the claim so the member may
  retry, but the sponsor pays for it; a rate limit on the sponsor is the only protection.
- Not tested: p2p gossip verification, real epoch proofs, a live network, quiet-machine proving times, more than one
  node, an external relayer over the network (the relay here was in process), reorg across L1.
- No bound was put on tx size or `NoteGetterOptions` growth: `add_member` twice stores two notes; harmless here.
- `effect` stays in `client/package.json` only because the file was copied from the prior spike.

## Reproduce

```sh
cd spikes/chain-languages/aztec
bash scripts/install.sh            # tools/: Node, nargo, anvil/forge, aztec-packages sparse checkout, npm ci
bash scripts/codegen.sh            # compile contracts, generate client/src/generated/Governance.ts
source env.sh && cd client && npx tsc -p .
node --import tsx src/bin/classify.ts           # Q1 (no network needed)
cd .. && scripts/net.sh start                    # plain local network, ~27 s; scripts/net.sh stop
cd client
node --import tsx src/bin/q2-token.ts            # Q2
node --import tsx src/bin/q4-state.ts            # Q4
node --import tsx src/bin/q5-refusals.ts && node --import tsx src/bin/q5-decode.ts   # Q5
node --import tsx src/bin/q3-q6.ts               # Q3, Q6 (then restart the network: it rolls back one block)
node --import tsx src/bin/q6b-rollback.ts 5      # Q6 rollback probe (restart the network afterwards)
node --import tsx src/bin/q7-inprocess.ts        # Q7: in-process network, verification ON then OFF (does not use ports)
node --import tsx src/bin/q8-crosscheck.ts real 40            # Q8, ~15 min
node --import tsx src/bin/q8-crosscheck.ts mock 300 1,42,1234 # Q8 long, mock proofs, ~15 min
```

`scripts/reproduce.sh` runs all of it and stops every process on exit. Ports used: 8080 (node), 8880 (admin), 8545
(anvil) for the CLI network; the in-process Q7 network picks an ephemeral anvil port. The startup banner of the CLI
network prints test account secrets; `client/src/bin/network.ts` discards it and only keeps filtered error lines in
the git-ignored `runtime/`.
