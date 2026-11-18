# Spike: EVM / Solidity on Anvil (one third of `chain-languages`)

Throwaway code. Never imported by a package. Shared blueprint: `../spec.md`; shared reference machine: `../reference.ts`.

## Question

If Orthograph generates a Solidity contract from the mini-DAO blueprint, with the developer writing only
`_open`/`_vote`/`_close`: (Q1) what is on chain and what may clients call; (Q2) how do contracts we did not write come
in; (Q3) who signs and who pays; (Q5) how does a refusal get from raw revert bytes to a typed class with a stable code,
and what makes a code unstable; (Q6) how does a follower decide "confirmed" and survive a reorg; (Q7) what is the local
world; (Q8) does the contract agree with the TypeScript reference machine?

## What was built (all in this folder)

| File | What it is |
|---|---|
| `src/Governance.sol` | The "generated" abstract base: role check, machine check, then `_open/_vote/_close`; `open`, `vote`, `voteBySig` (EIP-712), `close`, `addMember`, read `get`; custom errors; the four events |
| `src/MiniDao.sol` | The developer file: the three bodies, plus a `public view` helper (`tallyOf`, overloaded), an overload of a declared read (`get(bytes32,bool)`), an `internal` helper (`_margin`), and an **undeclared** state-changing `forceClose` |
| `src/GatedDao.sol`, `src/tokens/*.sol` | Q2(b): vote needs >= 1 unit of someone else's token (OpenZeppelin ERC-20 and four hostile tokens) |
| `src/CodedDao.sol`, `src/variants/*.sol` | Q5: `error Refused(bytes6 code, bytes data)`, six error-shape variants, and a deliberately wrong `MutantDao` |
| `script/classify.ts` | Q1 classifier. `script/decode.ts` Q5 decoder. `script/q2,q3,q5,q6,q7,q8.ts` the experiments |
| `src-ts/adapter/token.ts` | Q2(a) ABI-typed adapter; `typecheck.ts` proves the typing with `@ts-expect-error` |
| `src-ts/follower/follower.ts` | Q6 follower (state in, events out, JSON checkpoint) |
| `evidence/` | Raw output of every run. `versions.json` exact versions and dates. `run-all.sh` reproduces everything |

Differences from `spec.md`'s literal event list: `VoteCast` also carries `voter` (indexed), because on the relayed path
`msg.sender` is the relayer. `ProposalId` is `bytes32`; `Digest` is `bytes32` keccak256; `Choice` is a `uint8` enum.

## Found (each: validated / refuted / not tested)

### Q1 Surface

1. **Classification by full signature works; by name alone it is wrong.** The MiniDao ABI has 29 entries; the
   classifier sorted them into 5 operations (`voteBySig` maps to `proposal.vote`, relayed), 1 declared read, 8 helpers
   outside the surface, 1 undeclared (`forceClose`, exit code 3), events and errors. Two names are overloaded (`get`,
   `tallyOf`): `get(bytes32,bool)` is a helper, not the declared read. **Validated.**
   [evidence/q1-classify.txt](evidence/q1-classify.txt), [evidence/q1-forge-inspect.txt](evidence/q1-forge-inspect.txt)
2. **Generated code adds ABI entries too.** `admin()`, `isMember()`, `nonces()`, `VOTE_TYPEHASH()`, `eip712Domain()`
   (OpenZeppelin) are public getters that become part of the ABI. The surface manifest must list them as "generated
   helpers", not leave them to be classified as the developer's. **Validated.**
3. **What the ABI carries:** names, input/output types and names, mutability, events with `indexed`, error names and
   field types. **What it lacks:** roles, the machine (which state a call needs/leaves), refusal codes, *which errors a
   function can raise* (errors are contract-wide, and include library errors: `InvalidShortString`, `StringTooLong`
   leaked in from OZ's EIP712), the blueprint operation name, internal/private functions (invisible, as intended), and
   source order (the JSON is sorted alphabetically). **Validated.**
4. **A side channel exists:** NatSpec `@custom:operation / @custom:allowed / @custom:errors` survive in the artifact's
   `metadata.output.devdoc` (inherited functions included), but NOT in the ABI, and `forge inspect devdoc` drops them.
   Read the artifact JSON, not `forge inspect`. **Validated** (end of `q1-classify.txt`).
5. **A behavioural cross-check cannot see an undeclared function.** The Q8 sequences only call declared operations,
   so `forceClose` (anyone can set a proposal to `failed`) is invisible to them. Only the static ABI check catches it.
   **Validated by construction.**
6. Storage (Q4 sketch): `isMember` slot 2, `nonces` slot 3, `_proposals` slot 4, developer's `_voted` slot 5 (EIP-712 name
   and version fallbacks take slots 0-1). A client needs only the address and the ABI; for the relayed path also the
   EIP-712 domain (`name`, `version`, `chainId`, `verifyingContract`, readable from `eip712Domain()`). No rent.
   **Validated** ([q1-forge-inspect.txt](evidence/q1-forge-inspect.txt) end).
7. `forge build` lints "event emitted after external call" (`reentrancy-events`) once a body calls someone else's
   contract before `VoteCast` is emitted (`Governance.sol:113`): the generated wrapper emits after the body, so the
   gate call precedes the event. Harmless here (`vote` has no reentrancy surface), but a generator should emit
   events from a place that is documented as safe, or accept the lint. **Validated.**

### Q2 Someone else's contract

8. **(a) Typed adapter from the ABI: validated.** OZ `ERC20` deployed by account 9, our admin is account 0. A
   `getContract` + `as const` ABI adapter reads `balanceOf` and returns typed `Transfer` args; `tsc` proves wrong
   function names, wrong argument types, a wrong result type and a wrong event field do not compile.
   [evidence/q2-someone-elses-token.txt](evidence/q2-someone-elses-token.txt), [evidence/q2-typecheck.txt](evidence/q2-typecheck.txt)
9. **(b) The gate follows *their* state, and it adds a refusal the blueprint does not have.** Acct 2 gave its unit away
   and was refused with `NoToken`; acct 3 received it and voted. `NoToken` is outside the four codes: a gate feature
   must declare its own error and code. **Validated.**
10. **How a revert inside their contract reaches our decoder** (same file, last section):

    | Their failure | Bubbled (plain call) | Wrapped (`try/catch` -> `GateCallFailed(token, bytes)`) |
    |---|---|---|
    | custom error `TokenPaused(uint256)` | their selector `0xc2d830ac`; typed only if we hold their ABI, else `unknown` | our typed error; inner bytes decode with their ABI, found by token address |
    | `revert("token: paused")` | `Error(string)`, origin unknowable | typed wrapper, inner string |
    | divide by zero | `Panic(0x12)`, indistinguishable from our own panic | typed wrapper, inner panic |
    | infinite loop (63/64 gas rule) | **empty revert** (out of gas inside the callee looks like a bare revert) | `GateCallFailed(token, 0x)` |
    | the address is not a contract | empty revert | **empty revert, not caught**: `try` does its code-size check outside the catch |

    So: what cannot be typed is anything from their contract unless we hold its ABI; out-of-gas and non-contract
    look like "no reason". **Validated.**

### Q3 Signer vs submitter

11. **Both paths work and differ exactly where expected.** Direct: tx sender = voter = payer. Relayed: the member signs
    EIP-712 `Vote(proposal, choice, nonce, deadline)` (signed on the node via `eth_signTypedData_v4`, no key leaves
    Anvil), acct 7 (no role) submits and pays about 113k gwei, `VoteCast.voter` is the signer, signer balance delta 0,
    signer nonce 0 -> 1. **Validated.** [evidence/q3-signer-vs-submitter.txt](evidence/q3-signer-vs-submitter.txt)
12. **Relayed refusals.** Relayer simulates first and sees the same revert bytes, the same decoder works. But:
    a **replay shows `InvalidNonce`, not `AlreadyVoted`** (the nonce check comes first, so the "real" reason is
    hidden); a tampered choice or garbage/short signature all recover a random address and show **`NotAllowed`**
    (cannot tell tampering from "not a member"); `SignatureExpired` and `InvalidNonce` are two refusals that exist only
    on this path and are not in the blueprint's four. **Validated.**
13. **A refusal sent without simulating costs the relayer, the signer never learns.** Mined `reverted`, gasUsed 30344,
    relayer paid ~39.6k gwei, no event, the receipt carries no reason, signer balance and nonce unchanged.
    **Validated.** The reason is only recoverable by tracing (`debug_traceTransaction` callTracer returns `output`).
14. **Two relayers racing one signature:** both simulate OK; A lands (`status success`, one `VoteCast`), B is a mined
    revert (replayed as a call: `InvalidNonce(1, 0)`), yet the signer's vote IS on chain. **Validated.**
    Consequence for `submission.confirmed` (decisions, below).
15. Deadline is compared with **block** time, and Anvil's clock is wall clock unless told otherwise
    (`evm_increaseTime` +7200 expired a +3600 signature). **Validated.**

### Q5 Refusals

16. **All four refusals decode from raw bytes to the typed shape with the stable code**, including `ProposalNotOpen`'s
    `state` (`absent`/`open`/`passed`/`failed`), and the check order is role, machine, body (outsider + absent +
    duplicate gives `AR-001`). **Validated.** [evidence/q5-refusals.txt](evidence/q5-refusals.txt) section 1
17. **Refusals that arrive with no code at all** (section 2): `enum` out of range (`choice=2`) is an **empty revert, not
    a Panic** (the ABI decoder reverts bare); short calldata and unknown selector (no fallback) are empty reverts; an
    `eth_call` that runs out of gas returns RPC error `-32003 "EVM error OutOfGas"` with **no data field**; below
    intrinsic gas `-32000`; a mined out-of-gas tx is `status: reverted` with no reason (trace says "out of gas"); a
    panic from someone else's code is `Panic(0x12)`; `Error(string)` from a library. **Validated.**
18. **`eth_sendTransaction` from an unlocked account does not simulate**: the doomed tx was mined (`reverted`, one
    block) although `eth_estimateGas` for it returns code 3 with the revert data. The SDK must `eth_call` first itself;
    nothing else will stop it. **Validated.**
19. **What makes a code unstable (selector = first 4 bytes of keccak(`Name(types)`))**, six compiled variants decoded by
    a client built from V0 (section 3):

    | Change | Selector moves? | Old client |
    |---|---|---|
    | rename the error (`AlreadyVoted` -> `HasVoted`) | **yes** | `unknown`, code lost |
    | add a field | **yes** | `unknown` |
    | change a field type (`bytes32` -> `uint256`) | **yes** | `unknown` |
    | rename a field only | no | decodes |
    | reorder declarations in source | no (and the ABI JSON is sorted anyway) | decodes, **but** a generator that derives the code from declaration order now maps the same selector to the other code (`AlreadyVoted` PR-001 -> PR-002): a silent swap |

    So the *wire* is unstable under rename/field/type changes; the *code* is unstable under reorder if it is derived
    from order. **Validated.**
20. **Code inside the error** (`error Refused(bytes6 code, bytes data)`, section 4): the selector never changes, so a
    rename, a reorder and an added field all still decode to the right code (the added field decodes with the old
    schema, extra trailing bytes ignored). Costs: 100/132 bytes of revert data vs 4/36; the typed fields are no longer
    in the ABI (the schema code -> field types must come from the blueprint registry, not the ABI); explorers and
    `forge test` cannot show the typed error. A changed *type* of equal width (`bytes32` -> `uint256`) decodes silently
    to the wrong meaning, so the schema check must be exact. **Validated (prototype).**
21. Panics and bare reverts have no code in either design; an own-uncoded error (`NoToken`, `InvalidNonce`) decodes to
    its name but no code until the blueprint gives it one. **Validated.**

### Q6 Events and confirmation

22. **Anvil's `safe` and `finalized` tags are derived, not consensus**: `safe = latest - E`, `finalized = latest - 2E`,
    `E = 32` (`--slots-in-an-epoch`), clamped at 0. Head 100 -> safe 68, finalized 36; with E=4, head 9 -> 5 and 1.
    So `finalized` exists only after 64 mined blocks: a test must mine. **Validated.**
    [evidence/q6-follower.txt](evidence/q6-follower.txt) section 0
23. **Follower: validated.** Checkpoint = `(number, hash)` + a window of block hashes; `getLogs` over the new range;
    `confirmed` by depth N and/or tag; the publishing link matches the event's `digest` against
    `keccak256(revision body)`: `published` / `digest-mismatch` (body edited after freeze) / `no-revision`. A restart from
    the JSON state emitted nothing twice. A reverted `open` emits no log, so the follower can never see a refusal;
    refusals are the submitter's concern (receipt/trace), not the follower's.
24. **Reorg: validated.** `anvil_reorg` takes positional params `[depth, [[tx, blockIndex], ...]]` (the object form fails
    with "expected u64"). A dropped tx: same head number, new hash, receipt gone, `getLogs` returns nothing (**no error,
    not even when filtering by the old block hash**), so the follower can only know by comparing stored hashes. It emits
    `reorg{ancestor}` then `correction{wasConfirmed}` per lost event. With a depth policy of 3 and a depth-3 reorg that
    replays a *different digest* for the same proposal: `confirmed` -> `correction{wasConfirmed:true}` -> `observed` ->
    `confirmed` with `digest-mismatch`: the publishing link flips. `evm_snapshot`/`evm_revert` shortens the chain
    (head < checkpoint), also handled.
25. **Tag policy: validated.** `{tag:"safe"}` confirmed once the block was at or below `safe`; `finalized` later. On a
    real chain these are real consensus levels; on Anvil they are depth in disguise, so a depth policy and a tag policy
    behave the same here and **the local world cannot show the difference**.

### Q7 Local world

26. Start: 156 ms median (154-188 over 10 cold starts) to first `eth_chainId`. Cold `forge build --force` 1.07 s (solc
    0.8.30 cached after the first download). Default instant mining: 27 ms median send-to-receipt (viem polling set to 20
    ms; **viem's default 4 s polling made a 35-tx script take 2.5 minutes**), one block per tx.
    `--block-time 1`: ~990 ms per tx plus an empty block per second. `evm_setAutomine(false)`: the tx sits in
    `txpool_status` until `evm_mine`. `evm_revert` 0.8 ms (a per-test reset), `anvil_dumpState` 4 ms. **Validated.**
    [evidence/q7-local-world.txt](evidence/q7-local-world.txt)
27. Time: block timestamps follow wall clock; `anvil_setBlockTimestampInterval(12)` makes time move only when blocks
    are mined; **`evm_increaseTime` is ignored while a fixed interval is set** (12 + 12, not +86400). **Validated.**
28. **Real:** EVM semantics and gas metering, `ecrecover`, revert data, events, `eth_call`/`estimateGas` behaviour (hard
    fork `Bpo1`). **Faked:** no consensus, no mempool competition or fee market (first-come blocks, base fee 1 gwei),
    10 unlocked accounts with 10000 ETH each (`eth_sendTransaction` and `eth_signTypedData_v4` use node-held keys: a
    production relayer cannot do either), finality tags derived, a reorg only on command, no latency or rate limits.
    The anvil banner prints private keys, so everything runs with `--silent`. **Validated.**

### Q8 Cross-check

29. **1500 steps (5 seeds x 300), 0 divergences**, 5.7-7.1 s wall time. Each step is simulated from the right caller
    (actor i = dev account i), sent only if the simulation says ok, then state/tally read back; a third of the votes go
    through `voteBySig` with acct 7 as relayer; the end state (every proposal's digest, tally and state, every member)
    also matches. No simulation said ok and then reverted. Every code was reached: AR-001 222, PR-002 226, PR-001 65,
    PR-900 absent 49 / passed 218 / failed 527, ok 193 (the sequences are refusal-heavy: 87%). **Validated.**
    [evidence/q8-cross-check.txt](evidence/q8-cross-check.txt)
30. **The check can fail**: `MutantDao` (ties pass) gave 457 divergences. **Validated.**
    [evidence/q8-cross-check-mutant.txt](evidence/q8-cross-check-mutant.txt)
31. **Not found by the cross-check, found by reading:** the reference has `NotAllowed` fire before `ProposalNotOpen`; the
    spec's "NotAMember dropped" holds on chain too (a non-member signer is `NotAllowed`). No bug on either side.

## Decisions this supports for Orthograph's chain design

1. **Operation -> ABI mapping, and what clients may call.** One `external` function per declared operation, named by its
   verb, plus a relayed twin (`voteBySig`) for each operation a member signs. The generator emits a manifest
   (`blueprint op -> signature -> selector`), and the SDK reaches only manifest entries. CI classifies the compiled ABI by
   full signature (never by name: overloads exist) and fails on any **state-changing** entry not in the manifest;
   `view`/`pure` helpers are allowed, never typed in the SDK. Generated getters (`admin`, `isMember`, `nonces`,
   `eip712Domain`) are listed as generated. Roles, machine and codes are not in the ABI: carry them in the manifest, with
   the NatSpec `@custom:` tags as an optional in-artifact copy. This check is static; a behavioural cross-check will never
   find an undeclared function.
2. **Outside contracts.** An adapter typed from the third party's ABI (`as const`) for reads and events, with its own
   follower checkpoint. Calls *from* our contract to theirs are wrapped (`try/catch`) into one declared refusal carrying
   `(token, bytes)`, preceded by an explicit `code.length > 0` check (the only way to get a typed error for a non-contract);
   the client decodes the inner bytes with their ABI looked up by address. Anything a third party reverts with and we
   hold no ABI for stays `unknown`; out-of-gas inside their code is indistinguishable from a bare revert.
3. **Refusal-code stability.** The wire identity of a typed custom error is its selector, so rename, field add and type
   change break old clients; reorder breaks codes only if codes derive from order. Recommend: codes are assigned once
   and recorded in an append-only lock (`code, signature, selector`), never derived from order; the compiler refuses to
   rename or reshape a published error without a new code (old selectors stay in the lock and keep decoding). Prefer this
   over `Refused(code, data)`: it keeps typed errors in the ABI and tooling at 4/36 bytes. Use `Refused` only if clients
   must decode contracts older than their registry. Relayed-path refusals (`InvalidNonce`, `SignatureExpired`) need
   declared codes too; panics and bare reverts are a distinct "no code" class in the decoder.
4. **Confirmation semantics.** `submission.confirmed` must mean "the follower saw the declared event for this *intent* at
   the environment's confirmation level", where intent = `(proposal, voter)` for a vote (the relayed signature adds
   `(signer, nonce)`), **not** "my transaction succeeded": a racing relayer's tx can land first and ours then reverts with
   `InvalidNonce` while the vote is on chain. So: `submitted` (simulated ok, tx hash) -> `included` (receipt success, may
   still reorg) -> `confirmed` (event at depth N or `safe`; `finalized` for money). `Dropped` when the signature's nonce
   was consumed by something else, the deadline passed, or the block was reorged out and not replaced. Add the signed
   `nonce` to `VoteCast` on the relayed path so the match is exact. Simulation must run before send (nothing does it for
   us: Anvil mines doomed txs), and deadlines are judged against block time.
5. **Follower and reorg.** Checkpoint plus a block-hash window; detect by hash comparison (the node will not tell us);
   emit `correction{wasConfirmed}` as a first-class event that downstream (publishing link, portal, D1) must handle,
   because a depth policy can confirm and later retract, and a replacement can carry a different digest. Local worlds
   force it with `anvil_reorg`. Depth and tag policies are indistinguishable on Anvil; only a real chain tells them apart.

## Open risks

- Tags on Anvil are depth in disguise: the `safe`/`finalized` path is untested against real consensus levels (and a
  public chain's `safe` can lag or stall in ways Anvil cannot show).
- The follower fetches every block in a range (fine locally); a production one needs header batching and a pruned window.
- Window size must exceed the deepest tolerated reorg; a deeper one is silently treated as "ancestor not found".
- Subscriptions (`removed: true` logs) were not tried; `eth_getLogs` alone gives no removal signal.
- The selector lock is a design here, not built; alias handling for a renamed error was only reasoned.
- Event ordering/`logIndex` stability across a replayed reorg block was not stressed.
- One chain, one contract; no upgradeability, proxies, CREATE2 address derivation, multiple contracts per workshop
  (`per: "workshop"` means deploying one per workshop: not exercised), nor gas-cost budgets.
- Third-party ERC-20s with non-standard returns (USDT-style) not tried; only a standard OZ token and four hostile ones.
- `viem` 2.57.20 was published 2026-11-15 08:19 UTC, so it passed the three-day rule only from 08:19 UTC on 18 November (2.58.0 was too young); a package pinning it later should use it, or 2.57.19 if added earlier in the day; the whole npm tree is within the rule (see `versions.json`).

## Reproduce

```bash
cd spikes/chain-languages/evm
npm ci                                   # exact pins in package.json; esbuild's install script is not needed by tsx
export PATH="$HOME/.foundry/bin:$PATH"    # forge/anvil/cast 1.8.6
./run-all.sh                              # build, ABI gen, tsc, Q1..Q8 -> evidence/ (about a minute); stops Anvil via trap
# or one at a time:
forge build --force && npx tsx script/gen-abi.ts
npx tsx script/classify.ts MiniDao        # exit 3 = undeclared state-changing entry found
npx tsx script/q2.ts   # token adapter + gate      npx tsx script/q3.ts   # direct vs relayed
npx tsx script/q5.ts   # refusals                  npx tsx script/q6.ts   # follower and reorg
npx tsx script/q7.ts   # local world               npx tsx script/q8.ts 300 [MutantDao]   # cross-check
```

Everything uses Anvil on port 18545 only, started and killed by each script (and `run-all.sh`'s trap). No key or
mnemonic is printed or written: Anvil runs `--silent`, transactions and typed-data signatures use its unlocked dev
accounts by address. Installs: npm packages in `node_modules/` (git-ignored); solc 0.8.30 in `~/.foundry/solc` (forge's
normal location); OpenZeppelin comes from npm and is remapped in `foundry.toml`; nothing under `tools/`.
