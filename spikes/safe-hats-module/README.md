# Safe, Hats and budgets spike

## SafeTx signatures

The owners sign EIP-712 typed data with `primaryType: "SafeTx"`. The domain is
`EIP712Domain(uint256 chainId,address verifyingContract)`. Read `chainId` from the
network and use the Safe **proxy** address as `verifyingContract`. The domain has
two fields. The client builds the message and checks that its digest equals
the proxy's `getTransactionHash(..., nonce)`. [Runnable encoder](script/safe.ts)

The type string is exact, including field order and spelling.

```text
SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)
```

- `to` is the destination and `value` is native currency in wei. `data` is
  the raw target calldata. EIP-712 uses `keccak256(data)` in the struct hash.
- `operation` is `0` for Call and `1` for DelegateCall. This spike uses Call.
- `safeTxGas`, `baseGas`, `gasPrice`, `gasToken` and `refundReceiver` are the
  Safe execution and reimbursement settings. The proof uses zero for all five.
- `nonce` is read from the Safe proxy. Owners sign it with the other fields.
  The relayer sends the other nine fields and the packed signatures to
  `execTransaction`. Safe takes the nonce from storage. It is separate from
  the relayer's account nonce and from the budgets module's spend nonce.

Pack one 65-byte header per required signature. Sort headers by increasing
numeric **owner** address. Checksummed casing has no effect. ECDSA headers are
32 bytes of `r`, 32 bytes of `s`, then one byte of `v`. All values below are decimal.

| Signature | `v` | Header and signing rule |
| --- | --- | --- |
| ECDSA over typed data | 27 or 28 | `r`, `s` and recovery parity plus 27. Sign the SafeTx EIP-712 digest. |
| Prefixed ECDSA (`eth_sign` form) | 31 or 32 | `r`, `s` and the normal 27 or 28 plus 4. Sign the **raw 32 digest bytes** with the EIP-191 message prefix. The run uses viem `signMessage`. |
| Approved hash | 1 | Left-pad the approving owner address to 32 bytes for `r` and use zero for `s`. The owner calls `approveHash(digest)` before a third party relays, as in the run. Safe also accepts this slot when that owner is the executor. |
| Contract owner (ERC-1271) | 0 | Left-pad the contract owner address to 32 bytes for `r`. Put the byte offset to the dynamic signature tail in `s`, counted from the first byte of the whole signature blob. After the sorted headers, append the tail as a 32-byte length followed by the contract's signature bytes. For two headers and one contract signature, the offset is 130. |

A Safe acting as a contract owner uses its CompatibilityFallbackHandler. The
inner Safe's owners sign `SafeMessage(bytes message)` with the **inner** proxy as
the verifying contract and the outer SafeTx digest as the raw 32 bytes of
`message`. Pack the inner signatures in ascending owner order and use them as
the outer contract slot's dynamic payload. The same wrapping also lets a Safe
sign the spike module's own EIP-712 digest for OpenZeppelin's
`SignatureChecker.isValidSignatureNow`. [Safe 1.5.0 contract](https://github.com/safe-fndn/safe-smart-account/blob/dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be/contracts/Safe.sol),
[CompatibilityFallbackHandler](https://github.com/safe-fndn/safe-smart-account/blob/dc437e8fba8b4805d76bcbd1c668c9fd3d1e83be/contracts/handler/CompatibilityFallbackHandler.sol),
[Goal 4 run](evidence/goal-4.txt)

The Anvil run paid once through each signature format. Reversed owner order,
a typed-data signature with `v=2`, and a replay after the Safe nonce advanced
each mined a reverted transaction and decoded as `GS026`. The replay uses the
identical old calldata and signature blob. Safe recomputes the signed hash with
its current nonce, so the old signatures fail the owner validation.
[Signature run](evidence/safe-signatures.txt), [Runnable checks](script/safe-signatures.ts)

## Budget findings

1. One budget module served two Safes. Each row is keyed by the paying Safe
   and hat. Only a call from that Safe can create, change or revoke its budget.
   The person used their own admin hat to mint a child hat for the agent and
   later turn it off. The agent could spend under the child hat up to its own
   lower limit. [Anvil run](evidence/budget-anvil.txt)
2. Direct spends take the caller from `msg.sender`. Relayed spends check an
   EIP-712 signature with OpenZeppelin's `SignatureChecker`. The domain is
   `{ name: "Budgets", version: "1", chainId, verifyingContract }`, where
   `verifyingContract` is the budget module. The type is
   `BudgetSpend(address safe,uint256 hatId,address to,uint128 amount,address signer,uint256 nonce,uint256 deadline)`.
   The signed path checks deadline, signature, nonce, row, hat, amount and
   payment, in that order, then emits the spend. A signer's nonce is shared
   across both entries and all rows in this module. The module's budget events
   put indexed `by` first and `nonce` second. [Encoder](script/budget-data.ts),
   [Foundry run](evidence/budget-foundry.txt)
3. The row's ERC-20 supplies the units. Limit, spent, amount and remaining
   are unsigned `uint128` base units and travel on the wire as digit strings.
   The client reads the token's symbol and decimals for display. The run
   showed exactly `1.250001 SPIKE6` and `1.250000000000000001 SPIKE`. Foundry
   paid the full `uint128` maximum. The module widens the amount for ERC-20
   `transfer` through Safe's `execTransactionFromModuleReturnData` so a token
   returning false can be refused. [Money evidence](evidence/budget-anvil.txt),
   [Payout code](src/SafePayment.sol)
4. The prototype uses fixed periods starting at Unix epoch multiples of the
   configured length. It restores the full limit at the next boundary. The
   Safe can change the limit during a period while keeping prior spend charged.
   It can revoke the row permanently. Token and period length are fixed at
   creation. Calendar-month rules and payouts from fee-on-transfer or rebasing
   tokens are outside this proof. [Rollover and limit tests](evidence/budget-foundry.txt)
