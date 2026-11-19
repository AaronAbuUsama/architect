import { Config, Effect } from "effect";
import { makeChainPort } from "@orthograph/chain-evm/device";
import type { ChainApi } from "./types.ts";
import { CAIP2 } from "./internal/caip2.ts";

/** How often a send looks for its receipt. A local chain mines at once; a real one answers within a few polls. */
const POLL_MS = 500;

const host = Config.all({
  chain: Config.String("ORTHO_WALLET_CHAIN").pipe(Config.withDefault("eip155:1")),
  rpcUrl: Config.option(Config.String("ORTHO_WALLET_RPC_URL")),
});

export const Chain: ChainApi = {
  fromHost: Effect.gen(function* () {
    const { chain, rpcUrl } = yield* host.pipe(Effect.orDie);
    const found = CAIP2.exec(chain);
    if (found === null) return yield* Effect.die(new Error(`ORTHO_WALLET_CHAIN is "${chain}": a wallet takes an EIP-155 chain as CAIP-2, such as eip155:31337`));
    return { chainId: Number(found[1]), rpcUrl: rpcUrl._tag === "Some" ? rpcUrl.value : undefined };
  }),
  port: (setting) =>
    Effect.gen(function* () {
      if (setting.rpcUrl === undefined) return yield* Effect.die(new Error("this wallet has no chain to send on: set ORTHO_WALLET_RPC_URL"));
      return yield* makeChainPort({ chainId: setting.chainId, rpcUrl: setting.rpcUrl, pollIntervalMs: POLL_MS }).pipe(
        Effect.catch((fault) => Effect.die(new Error(`the chain at ORTHO_WALLET_RPC_URL is unusable: ${fault.message}`))),
      );
    }),
};
