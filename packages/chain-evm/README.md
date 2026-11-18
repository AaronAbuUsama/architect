# EVM chain port

`makeChainPort` creates an Effect adapter for one RPC chain ID. It uses Orthograph's
`Timers` for polling and backoff. The wallet supplies a host signer. M1.32 supplies
the simulator. The EVM projection of `blueprint/refusals.lock` supplies error
signatures and historical aliases. See K7 for the chain model.

The nonce allocator, transaction manager and tracker, viem error mapping, and
event follower are adapted from `@prb/effect-evm@5.0.3`. The npm tarball's source
maps contain the upstream TypeScript. The upstream notice is
[LICENSE-prb-effect-evm](LICENSE-prb-effect-evm). viem is a direct dependency and
is confined to this package in workspace lint.

Run the local proof with Foundry's Anvil on PATH.

```sh
ORTHO_CHAIN_EVM_ANVIL=1 pnpm exec vitest run --root packages/chain-evm src/modules/tx/anvil.test.ts
```

The test starts a silent Anvil on a free loopback port and stops it on scope exit.
