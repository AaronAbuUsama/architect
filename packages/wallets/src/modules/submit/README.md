# submit

`Submit.withKey` and `Submit.withProvider`: one transfer through K7 Q3's lifecycle on the `@orthograph/chain-evm` port:
prepare, **simulate** (never skipped: the port refuses to sign or submit what has not simulated, M1.32), sign, submit,
follow to inclusion.

- A transfer whose simulation fails (a revert, a panic, no funds) is `SimulationReverted`. Nothing was signed or sent, the
  nonce is handed back, so the next send takes the nonce this one would have had.
- A signer that would not sign (a locked keystore, a request the person turned down) is `KeyLocked`.
- `confirmed` for a plain transfer means included in a block, not reverted, at depth one: a local chain's level. The
  transfer has no event of its own to wait for, so the intent is the transfer itself.
- An unreachable chain, a timeout or a replaced transaction is a defect that says what, never a declared error.

`withProvider` is for a browser's wallet, which signs and sends in one step: the simulation runs here first, so a doomed
transfer is refused before the person is asked to approve it.
