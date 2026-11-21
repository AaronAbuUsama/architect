# Goal 7 running notes

1. **Pins verified.** Safe Smart Account 1.5.0 uses the current
   `isValidSignature(bytes32,bytes)` owner-signature path and ships the
   CompatibilityFallbackHandler. Its npm publication is dated 2 February 2026.
   Hats v1 is the 11 July 2023 release, resolved to an exact commit. Its solbase
   gitlink is pinned separately so the same source builds without fetching Hats'
   unrelated test dependencies. The existing EVM spike's compiler and npm
   versions carry over. All dates and sources are in `versions.json`.
   The lead moved the five Safe proofs ahead of Hats. Those are next.

2. **A1–A5 passed on Anvil.** The smallest deploy uses the Safe singleton,
   SafeProxyFactory and CompatibilityFallbackHandler. MultiSend is unnecessary
   for single calls. Both a one-owner Safe and a two-of-three Safe enabled the
   module by signing a SafeTx. Safe's boolean-only module entry returned true
   for a false-returning token and false for a reverting token. The return-data
   entry preserved the distinction, which the probe mapped to two errors.
   OpenZeppelin accepted the real Safe's ERC-1271 SafeMessage and rejected a
   tampered signature. The same probe accepted a Safe direct call submitted by
   a non-owner. See `evidence/goal-4.txt`. The first direct relay run exposed
   an address casing difference in the test assertion. Address comparison now
   ignores casing. Next is the Hats-only payment proof.
   The proof passed before Hats implementation began. Three staging attempts
   hit a sandbox denial creating this worktree's Git index lock. The proof and
   its evidence are preserved separately while the Hat work proceeds.

3. **Hats payments passed in Foundry.** A pinned Hats deployment and a real
   Safe proxy paid both assets, and all four refusal paths passed. The disabled
   module bubbled up Safe's GS104. Hats' configured toggle and eligibility
   addresses control the two revocations. The Safe signing helper needed a
   narrower Solidity scope to stay within the compiler's stack limit.
   See `evidence/hat-foundry.txt`. Next is the same Hats path on Anvil.

4. **Hats on Anvil and SafeTx formats passed.** The Anvil run now tests
   eligibility loss in addition to the disabled module, ETH and ERC-20 spends,
   the outsider and the inactive hat. It restores eligibility and remints the
   hat because Hats burns it on revocation. Four payouts executed using typed
   data, the EIP-191 form, an approved hash and a nested Safe as an
   ERC-1271 owner. Reversed order, wrong v and replay all mined with GS026.
   The README describes the exact wire format and links the two runs. The five
   Foundry tests and TypeScript typecheck passed. A fresh install verified the
   SHA-256 digests of Hats, solbase and forge-std before extracting them.
   M6-money was read for the next step. The lead handles the commit.

STEP 3 DONE: The pinned Hats and threshold Safe paid both assets and refused all four invalid paths on Anvil.
STEP 4 DONE: All four SafeTx signature formats executed and all three malformed cases reverted with GS026.

5. **Budgets passed in Foundry and on Anvil.** Only the Safe may create, change
   or revoke its row. That keeps the authority to allocate Safe funds with the
   Safe's owner threshold while a hat grants permission to spend an allocation.
   Both Safes used one module deployment. The child hat had its own smaller
   budget, and turning the child hat off blocked its wearer immediately.
   Spend receipts and ERC-20 balances confirm the module did not hold the funds.
   The fixed-length windows are epoch-aligned. A limit change preserves spend
   already charged to the current period. Revocation is terminal for a Safe
   and hat pair, keeping previously signed spends from applying to a recreated
   row with a different token. The token and period duration stay fixed.
   All money uses uint128 base units. The display preserves the last base unit
   with both six and eighteen decimals. The tests also transferred the full
   uint128 maximum. Moving the shared BudgetSpend amount to uint128 changed
   the Goal 4 digest, so its proof was re-run too. Safe's return-data path still
   validates ERC-20 transfer results. Evidence is in `evidence/budget-foundry.txt`
   and `evidence/budget-anvil.txt`.

STEP 5 DONE: All 13 Forge tests and the full Anvil script passed, including budgets, rollover, child-hat controls and exact token amounts.
