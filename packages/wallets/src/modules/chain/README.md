# chain

The chain a wallet is on: `Chain.fromHost` reads `ORTHO_WALLET_CHAIN` (CAIP-2, default `eip155:1`) and
`ORTHO_WALLET_RPC_URL` through Effect's config provider, and `Chain.port(setting)` is the `@orthograph/chain-evm`
port for it. A wallet with no RPC endpoint makes keys, lists and signs; a send is a defect that names the variable.

The host decides where the values come from. A CLI reads its environment; a browser supplies a provider of its own; a
world gives the chain it stood. Nothing here holds a key.
