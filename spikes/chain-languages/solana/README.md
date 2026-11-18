# Spike: the mini-DAO on Solana (Rust, Anchor 1.2.2)

One third of the chain-languages spike (`../spec.md`; siblings `../evm/`, `../aztec/`). Throwaway code, never imported by a
package. Everything here ran on a local `solana-test-validator`; no cloud, no testnet, no key printed or written
(keypairs are generated in memory; the only key files are the validator's own identity files in its git-ignored ledger
and the program-id keypair in git-ignored `target/deploy/`).

## Question

K5 and `allowance-on-chain.md` sketch what a generator emits for a chain operation, in Solidity. Where does **Solana**
differ, and which of those differences must Orthograph's chain design absorb? Specifically K7's eight questions: the
surface (Q1), someone else's program (Q2), signer vs submitter (Q3), state and accounts (Q4), refusals (Q5), events and
confirmation (Q6), the local world (Q7), and a cross-check against `../reference.ts` (Q8).

## What was built and tried

- `programs/governance/` an Anchor program in the shape a generator would emit. `lib.rs` has one entry per operation, each
  `role check -> machine check -> developer body -> emit!`; `state.rs`, `errors.rs`, `machine.rs`, `ixaccounts.rs`, `util.rs`
  play the generated parts; `body.rs` is the developer's (`vote_body`, a pub helper `tally_passed`).
  Instructions: `open_proposal`, `vote`, `close_proposal`, `add_member` (operations), `get_proposal` (declared read, a view
  instruction), `preview_outcome` (a developer's read-only helper), `reset_tally` (undeclared, state-changing), `initialize_workshop`
  (lifecycle: Solana has no constructor), `gate_transfer` (a CPI into SPL Token), `noisy` (log filler), and `vote_init`, the
  *(a)* variant of `vote` whose one-vote record is a plain `init`.
- Accounts: Workshop `[b"workshop", admin]` (admin, optional `gate_mint`), Member `[b"member", workshop, wallet]`, Proposal
  `[b"proposal", workshop, id u64 LE]`, VoteRecord `[b"vote", proposal, member]`. `ProposalId` is a `u64` (it is a PDA seed),
  `Digest` is `[u8; 32]`, `Votes` is `u32`.
- `src/` TypeScript "generated client in miniature" (`chain.ts`: PDAs, instruction builders from the IDL, simulate, partial signing,
  send, error decoder) and one script per question. `errdemo/` is a host-only crate that prints Anchor's error numbers.
- Reproduce in one command: `scripts/all.sh` (5.5 minutes, ends by checking no validator is left running).

## Versions and where they were installed

Exact versions and release dates are in [`versions.json`](versions.json). All at least 3 days old on 18 November 2026.

| Piece | Version | Installed at |
|---|---|---|
| Agave (`solana-test-validator`, `solana`, `cargo-build-sbf`) | 4.1.2 (2026-07-10) | `tools/agave/` (release tarball, git-ignored) |
| Anchor CLI | 1.2.2 (2026-10-28) | `tools/bin/anchor` (release binary, git-ignored) |
| platform-tools | v1.57 (2026-08-21) | **`~/.cache/solana/v1.57/`**, cargo-build-sbf's own user-level cache (not relocatable) |
| `anchor-lang` crate | =1.2.2 | `target/` |
| npm | `@anchor-lang/core` 1.2.2, `@solana/web3.js` 1.99.0, `@solana/spl-token` 0.4.15, `tsx` 4.23.15 | `node_modules/` |

The pair is the one Anchor 1.2.2's own release notes recommend (Solana 4.1.2, platform-tools v1.57). Agave 4.4.1
(2026-11-05) is newer; I took the documented pair rather than the newest of each. No shell profile was touched;
`scripts/env.sh` puts the tools on `PATH` for one shell. Two environment notes: `@anchor-lang/core` replaced
`@coral-xyz/anchor` (latest `@coral-xyz/anchor` is stuck at 0.32.1), and it still depends on `@solana/web3.js` **1.x**
although 3.2.1 is published, so the client side is on the 1.x line. The first `cargo build-sbf` downloads 430 MB of
platform-tools from GitHub; here it ran at about 150 KB/s and would have taken half an hour, so I fetched it with 12
parallel range requests and extracted it into the cache by hand (identical contents; after that a build takes ~30 s).

## Found

Each item: **validated** (observed here), **refuted**, or **not tested**; evidence file in `evidence/`.

### Q1 surface

1. **The surface is exactly the `#[program]` list, and the IDL classifies it.** 11 instructions: 4 operations, 1 declared read,
   1 lifecycle, 2 read-only helpers, 3 undeclared state-changing; spec entries missing from the IDL: none. A plain `pub fn`
   (`tally_passed`) is not in the IDL and cannot be called from outside. **Validated.** `q1-classify.txt`, `governance.idl.json`.
2. **What the IDL carries that an EVM ABI does not:** an 8-byte discriminator per instruction, event and account type
   (recomputed as `sha256("global:vote")[..8]` etc., all match); the full account list with `signer`, `writable`,
   `optional`, constant `address`es and PDA `seeds` (const / other account / instruction arg); the account struct types;
   return types; errors with number, name and message; docs. **Validated.** `q1-classify.txt`, `q1-raw.txt`.
3. **What it does not carry:** who the admin is or which account is "the role" (it only says `admin` is a signer); that an
   account is created (`init`) vs only read, so a lifecycle instruction is indistinguishable from an undeclared one except by
   name; our stable refusal codes; preconditions on account state (that a Member must exist, that `gate_token` is
   required when the workshop is gated); rent; and any account an instruction may touch through `remaining_accounts`
   or a CPI, so a state change routed through those is invisible to a classifier (this last point follows from the IDL's shape; not
   exercised). Two sharp edges seen: a read-only instruction that emits events (`noisy`) classifies as a harmless "helper";
   and a handler arg named `_id` (to silence an unused warning) leaves the seed path `arg:id` dangling, because seeds come
   from the `#[instruction(id)]` attribute, not from the function signature (`get_proposal` in the IDL). The generator must
   emit identical names. **Validated.** `q1-classify.txt`, `governance.idl.json`.
4. **Without Anchor** an instruction built by hand (discriminator, borsh args, account metas in order, an absent optional
   account written as the *program id*) is byte-identical to the IDL-built one, so a generator does not need the IDL
   to call the program, but there is then no machine-readable surface to classify: the discriminator and error numbering are
   whatever the author chose. Shank or Codama could emit an IDL for native programs. **Validated** (hand-built vs IDL-built),
   **Shank/Codama not tested.** `q1-raw.txt`.

### Q2 someone else's program (SPL Token)

5. **Read through a TypeScript adapter.** A mint created with a different authority than our admin; its account layouts
   (`MintLayout`, `AccountLayout`) play the ABI. SPL Token emits **no events**: the adapter follows `accountSubscribe` (saw
   `amount 1` appear) or the parsed instruction (`mintTo`). **Validated.** `q2-spl.txt`.
6. **`vote` gated on holding one unit works, and the client now passes an extra, optional account** (`gate_token`; the IDL says only
   `optional: true`, not when). Refused with `AR-001`: no gate account, someone else's token account, a token account of another
   mint, a zero balance, and an account owned by *our* program posing as a token account. The program must check the owner
   program of the account it was handed (`util.rs: holds_one`); Anchor's typed `Account<TokenAccount>` would do this, the
   hand-rolled version does it explicitly. Token-2022 has another program id and is **not covered**. **Validated.** `q2-spl.txt`.
7. **SPL Token's errors arrive as `Custom: n` with no IDL of ours.** An insufficient-funds CPI shows
   `{"InstructionError":[0,{"Custom":1}]}`, the same shape and number as if our program had failed with `1`. Only the logs say
   `Program Tokenkeg... failed` first (the innermost failure) and then ours repeats it. A decoder must key on
   `(program id, number)` taken from the logs. Direct and CPI failures look the same on the outside. **Validated.** `q2-spl.txt`,
   `decode` in `src/chain.ts`.

### Q3 signer vs submitter

8. **Relayer as fee payer, member as second signer** on one transaction: message keys `[relayer, member]`, signature slots
   `EMPTY, EMPTY` -> `EMPTY, signed` after the member signs -> the relayer signs and sends. A half-signed transaction can be
   simulated (`sigVerify: false`) but not sent ("did not pass signature verification"). The relayer paid 1,422,880 lamports
   (2 x 5,000 fee + 1,412,880 rent for the new VoteRecord); the member paid **0** and needs no SOL. If the member is its own
   `payer` it pays fee + rent itself. Rent and fee payers are separate roles; `payer` in our accounts is a free choice of the
   caller. **Validated.** `q3-signers.txt`.
9. **A pre-signed transaction dies with its blockhash.** 150 blocks of validity: 20.6 s at `--ticks-per-slot 16` (so about
   60 s at mainnet's 400 ms slots; not measured at 400 ms). The relayer's late signature is fine; the *signer's* signature
   covers the blockhash, so it cannot be refreshed: `BlockhashNotFound`, the member must sign again. A durable nonce account
   (80 bytes, 1,447,680 lamports) lets a signature wait: the transaction signed before a 20 s wait landed afterwards and
   advanced the nonce so it cannot land twice. **Validated.** `q3-signers.txt`.
10. **`submission.confirmed`.** Observed first-seen times from send (400 ms slots, 9 samples over three runs; `q6-follower-ticks64.txt` keeps the last 3): processed
    0.17-0.64 s, confirmed 0.19-0.70 s, finalized 15.3-19.1 s (4.2 s at 100 ms slots, so about 32 slots). `confirmed` is what a UI and a
    state machine can act on; `finalized` is what irreversible outward effects (publishing a revision) should wait for. A
    transaction that never lands has no error: it is `Dropped` once `lastValidBlockHeight` passes. **Validated** (timings);
    the recommendation is a design call, see Decisions.

### Q4 state and accounts

11. **The client must supply every account.** `vote` needs 8 account slots (7 plus the optional gate); the signed transaction is 452 bytes
    of the 1,232-byte limit. The client derives every PDA itself from `(program id, admin wallet, proposal id, voter wallet)` with no
    chain read; it cannot know whether a PDA exists, whether the workshop is gated, which token account to pass, or
    which accounts a third-party CPI will touch. The Workshop address is deployment configuration (the IDL has no seeds for it in
    most instructions), the nearest analogue of an EVM contract address. **Validated.** `q4-accounts.txt`.
12. **Rent, measured on chain** (matches `getMinimumBalanceForRentExemption`): Workshop 73 B 1,398,960; Member 73 B 1,398,960; Proposal 90 B
    1,517,280; VoteRecord 75 B 1,412,880 lamports. Each voting member locks about 2.8 M lamports (Member + VoteRecord) and gets nothing
    back because the program has no close instruction. Compute: open 10,042 CU, vote 22,036, close 8,215, add_member 12,417,
    get_proposal 7,422 (budget 200,000 per instruction). **Validated.** `q4-accounts.txt`.

### Q5 refusals

13. **Anchor's error numbers are positional from 6000.** Reordering the first two variants swaps their numbers; inserting a variant at
    the top shifts every number by one. A rename keeps the number (the IDL name changes). **Validated.** `q5-error-numbering.txt`.
14. **Explicit discriminants make them stable**: `AlreadyVoted = 1, ProposalExists = 2, ProposalNotOpen = 900, NotAllowed = 1001` gives
    6001, 6002, 6900, 7001 (the IDL reports those), and the same set reordered with a new variant keeps the same numbers.
    `#[error_code(offset = 0)]` also works but puts the numbers in 0..1001, where System (0, 1) and SPL Token (0..17) numbers
    collide; keep the 6000 block. **Validated.** (`rustc` rejecting duplicate discriminants is the language's rule, not tried.)
15. **Raw to typed:** `{"InstructionError":[0,{"Custom":6001}]}` plus logs decodes to `AlreadyVoted`, `PR-001` (all four codes decoded in
    `q5-refusals.txt`). `ProposalNotOpen { state }` carries its payload two ways, a log line
    (`refusal PR-900 ProposalNotOpen state=2`) and return data, and the return data is present in the simulation *and* in the landed
    failed transaction's `meta.returnData`. Anchor errors themselves carry no fields. **Validated.** `q5-refusals.txt`.
16. **(a) `init` vs (b) our own `AlreadyVoted`.** (a) `vote_init`: the second vote fails inside the System Program,
    `{"Custom":0}` with log `Allocate: account ... already in use`: not ours, no code. (b) `init_if_needed` plus a `voted` flag in the body
    returns `PR-001`. **Validated.** `q5-refusals.txt`.
17. **(a) is worse than "wrong code": it breaks the check order.** Anchor validates and `init`s accounts *before* the handler runs, so the
    `init` failure pre-empts `PR-900` and `AR-001`. The cross-check with (a): 271 of 1,500 steps diverge (every second vote, and a vote
    on a closed proposal by a member who had voted). Same for any `Account<T>` of something that may be absent (a non-member's Member PDA, a
    never-opened Proposal): Anchor would say `AccountNotInitialized` (3012) before our role/machine code runs. The generated program therefore reads
    those as `UncheckedAccount` plus `load()`, owner-and-discriminator checked by hand. **Validated.** `q8-crosscheck-variant-a-init.txt`.
18. **Refusals with no code of ours** (all observed): wrong PDA `ConstraintSeeds` 2006; missing signer `AccountNotSigner` 3010; uninitialised
    config `AccountNotInitialized` 3012; missing accounts `AccountNotEnoughKeys` 3005; rent short (System `Custom: 1`, "insufficient
    lamports"); `init` of an existing account (System `Custom: 0`); compute exhaustion `ProgramFailedToComplete` with log `exceeded CUs meter`;
    unfunded fee payer `AccountNotFound`; `BlockhashNotFound`; SPL Token `Custom: n`. The first four carry the Anchor name in the logs,
    not in our IDL. **Validated.** `q5-refusals.txt`.
19. **Preflight works and costs nothing.** `simulateTransaction` with `sigVerify: false` returns our code before anyone has signed:
    relayer balance change 0. Sending the same transaction anyway (skipping preflight) lands a **failed** transaction in a slot and costs
    10,000 lamports. **Validated.** `q5-refusals.txt` (last section); all 264 refused steps of seed 1 were also sent and landed with the same code (`q8-crosscheck.txt`).

### Q6 events and confirmation

20. **A follower reads `emit!` events from logs.** `Program data: <base64>` is 8-byte discriminator plus fields (80 bytes for
    `ProposalOpened`); `EventParser` decodes it. Three sources work: `logsSubscribe`, `getSignaturesForAddress` plus `getTransaction`
    (backfill: 10 signatures replayed 5 events), `accountSubscribe` on the Proposal PDA (saw `yes=1, 2, 3` at slots 44, 76, 108,
    but only state: no voter, no event name, and quick consecutive changes can coalesce). **Validated.** `q6-follower-ticks64.txt`.
21. **The publishing link holds:** `ProposalOpened.digest` read back at `confirmed` equals `sha256(frozen body)`. **Validated.** `q6-follower-ticks64.txt`.
22. **`emit_cpi!` events are not in the logs at all**: they are inner-instruction data (tag `e445a52e51cb9a1d` + event discriminator);
    `EventParser` on the logs finds nothing, decoding the inner instruction finds `MemberAdded`. **Validated.** `q6-follower-ticks64.txt`.
23. **Log truncation is real and size-dependent.** The runtime keeps 10,000 bytes of logs per transaction, drops any line that would cross
    the limit, writes `Log truncated` once, and still keeps later lines that fit. A 12 KB run of 400-byte lines kept the event line
    (121 bytes were left, luck); 200 short lines lost it and even the final `Program ... success` line, while the transaction succeeded.
    A log-only follower silently misses events. `emit_cpi!`, return data and account state are immune. **Validated.** `q6-follower-ticks64.txt`.
24. **Commitment, local numbers** (400 ms slots): processed 0.17-0.64 s, confirmed 0.19-0.70 s, finalized 15.3-19.1 s (9 samples, three runs);
    at 100 ms slots finalized is 4.2 s. **Rollback could not be forced:** the test validator is a single node with one linear chain.
    Real-chain semantics: `processed` can sit on a dropped fork and vanish with no error (then the blockhash expires); `confirmed` has a
    supermajority vote; `finalized` is rooted. **Not tested** (forced rollback).

### Q7 local world

25. **Start 0.5 s** to a healthy RPC (`--reset`, ledger in `test-ledger/`); airdrop 67-593 ms to `confirmed` (slot-length dependent);
    `solana program deploy` of the 223 KB `.so` 4.2-5.2 s; `anchor build` ~30 s from a source change (the kept `anchor-build.log` is a 1 s no-op rebuild), plus the one-time 430 MB
    platform-tools download. Ports as asked: RPC 18899, websocket 18900, faucet 19900, gossip and dynamic range 18010-18099.
    **Real:** the SBF VM and compute metering, signature fees (5,000/signature), rent, signature verification, account
    write-locking, the upgradeable loader, the built-in System / SPL Token / ATA programs. **Faked or different:** one node (no consensus,
    forks, leader schedule), a free faucet, all feature gates on, slot time is a flag, no fee market or priority-fee pressure.
    **Validated.** `q7-world-ticks64.txt`, `q7-world-ticks16.txt`, `q7-start-time-ticks*.txt`.

### Q8 cross-check

26. **Zero divergences.** Seeds 1, 2, 3, 42, 1234 x 300 steps (all of `SEEDS`, full length) against `../reference.ts` imported, not copied: each step
    simulated then, when clean, sent from a relayer fee payer with the actor as second signer; ok steps compare the on-chain
    Proposal's yes/no/state with `expected(...)`, refusals compare code and `ProposalNotOpen` state. 193 steps ok, 1,307 refused (`AR-001`
    222, `PR-900` 794, `PR-001` 65, `PR-002` 226). 67 s of wall time at 100 ms slots (seed 1, where every refusal is also sent, 140 ms/step; the other seeds 16-25 ms/step). The harness does
    detect a defect: the `init` variant diverges 271 times. **Validated.** `q8-crosscheck.txt`, `q8-crosscheck-variant-a-init.txt`.

## Decisions this supports for Orthograph's chain design

- **Operation to instruction.** One `#[program]` entry per declared operation (snake_case of the operation), the declared read as either an account
  decode (preferred: `Proposal` is a public account the generated client decodes from the IDL type, no simulate needed) or a view instruction
  returning data. The generated client exposes exactly {operations, declared reads}. Everything else in the IDL is outside the surface: `forman check`
  should diff the deployed IDL against the blueprint and fail on unknown state-changing instructions (3 here), treat lifecycle as a named
  generated class, and not trust "no writable accounts" to mean "no effects". On Solana the program is permissionless: the client list is
  a generation rule, the real guard is the program's role check.
- **Accounts are part of the client contract.** The generator emits, per operation, the account list with its derivation (seeds table) as
  a first-class artifact beside the payload type; the Workshop address is deployment config. Optional or conditional accounts (the gate token) have to
  be declared in the blueprint, because the IDL cannot say when they are needed. The generated client is therefore an *account resolver* plus an
  encoder; a hand-written program does not change this.
- **How outside programs come in.** A typed adapter per third-party program built from its own layouts or IDL (SPL Token has no events: follow
  accounts or instructions), keyed by program id; errors are `(program id, number)` and need the logs to attribute; our program must check the
  owner program and layout of every outside account it reads. The blueprint needs to declare "I read program X's accounts" so the generator emits the owner check.
- **Refusal-code stability.** Generate `#[error_code]` with explicit discriminants from a lock file (code -> number, never reassigned), in the
  6000 block (`PR-001`->6001, `PR-900`->6900, `AR-001`->7001); map `(our program id, number)` to the typed class. Carry payloads
  (`state`) in a log line and return data. Keep a separate typed union for faults that have no code of ours (Anchor framework, System, runtime,
  SPL). Generate any account whose absence is a refusal as an unchecked account read by hand, otherwise Anchor pre-empts the
  role -> machine order (finding 17). Preflight by `simulateTransaction` with `sigVerify: false`.
- **Confirmation semantics.** Make the commitment a named setting; recommend `confirmed` for state progression and UI and `finalized` for anything
  outward and irreversible (the publish link); the submission has a third outcome, `Dropped`, when `lastValidBlockHeight` passes. Followers should read
  events from `emit_cpi!` or account state, not logs alone. Pre-signed flows (relayer adds its signature later) must either sign just in time or use a
  durable nonce; document ~60 s at mainnet slot time.

## Open risks

- No fork locally: the `processed` -> dropped path and a follower's rollback handling are untested. Finality at 400 ms slots was sampled 9 times.
- Hand-rolled unchecked accounts move Anchor's owner/discriminator/seeds safety into generated code; each is a security surface to test per generator.
- Not tried: closing accounts and reclaiming rent, address lookup tables, the 1,232-byte and 64-account limits on larger blueprints, Token-2022, `remaining_accounts`,
  durable-nonce misuse, and write-lock contention (every vote writes the same Proposal account, so votes on one proposal serialise).
- Event and account discriminators are hashes of names: renaming an event or account type changes them, so followers and clients need the same
  lock discipline as error numbers.
- Client library split: Anchor TS needs `@solana/web3.js` 1.x while 3.x is current. First build downloads 430 MB from GitHub (CI needs the cache).
- Cross-check is 1,500 steps of a simple machine on a 100 ms-slot validator; one proposal id space (1..4), one workshop per seed.

## Reproduce

```bash
cd spikes/chain-languages/solana
npm install --save-exact                      # node_modules/ (git-ignored)
# tools (git-ignored): agave 4.1.2 into tools/agave/, anchor 1.2.2 into tools/bin/anchor (see versions.json);
# platform-tools v1.57 into ~/.cache/solana/v1.57/platform-tools (cargo-build-sbf downloads it on first build)
# program id: solana-keygen new --outfile target/deploy/governance-keypair.json, then put its pubkey in declare_id! and Anchor.toml
./scripts/all.sh                              # everything below, ~5.5 min; evidence/ is rewritten
# or by hand
source scripts/env.sh
anchor build --ignore-keys                    # program + target/idl/governance.json
npx tsx src/classify.ts                       # Q1 (no validator needed)
./scripts/run.sh 16 src/q5-refusals.ts        # fresh validator at 100 ms slots, deploy, run, always stop
./scripts/run.sh 64 src/q6-follower.ts        # 400 ms slots (finalized takes ~16 s)
VARIANT=init ./scripts/run.sh 16 src/q8-crosscheck.ts   # the (a) variant: must diverge
```

Evidence index: `q1-classify.txt`, `q1-raw.txt`, `governance.idl.json`, `q2-spl.txt`, `q3-signers.txt`, `q4-accounts.txt`,
`q5-error-numbering.txt`, `q5-refusals.txt`, `q6-follower-ticks64.txt`, `q6-follower-ticks16.txt`, `q7-world-ticks64.txt`,
`q7-world-ticks16.txt`, `q7-start-time-ticks*.txt`, `q8-crosscheck.txt`, `q8-crosscheck-variant-a-init.txt`, `anchor-build.log`, `run-*.log` (raw stdout).
