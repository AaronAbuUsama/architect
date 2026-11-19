import type { Effect } from "effect";
import type { Timers } from "@orthograph/language-effect";
import type { ChainPort } from "@orthograph/chain-evm/device";

/** The chain a wallet's accounts are on and, to send, where it answers. */
export interface ChainSetting {
  /** The EIP-155 chain id: the `31337` of `eip155:31337`. */
  readonly chainId: number;
  /** An HTTP(S) JSON-RPC endpoint. Without one a wallet makes keys and signs but cannot send. */
  readonly rpcUrl: string | undefined;
}

export interface ChainApi {
  /**
   * The setting the host gives: `ORTHO_WALLET_CHAIN` (a CAIP-2 id, default `eip155:1`) and `ORTHO_WALLET_RPC_URL`, read
   * through Effect's config provider (the process environment on a CLI; a browser supplies its own provider).
   * A malformed chain id is a defect that names the variable.
   */
  readonly fromHost: Effect.Effect<ChainSetting>;
  /** The chain port for a setting. An unreachable endpoint or another chain id is a defect that says so; no key is in it. */
  readonly port: (setting: ChainSetting) => Effect.Effect<ChainPort, never, Timers>;
}
