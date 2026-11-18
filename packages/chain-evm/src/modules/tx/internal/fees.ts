// Adapted from @prb/effect-evm@5.0.3 src/tx/{fees,replacement}.ts. See LICENSE-prb-effect-evm.
import { Effect } from "effect";
import type { PublicClient } from "viem";
import { rpcFault } from "../../faults/service.ts";
import { ChainFault } from "../../faults/types.ts";
import type { Transaction } from "../types.ts";

const legacyFees = (client: PublicClient) => Effect.tryPromise({
  try: () => client.getGasPrice(),
  catch: (error) => rpcFault(error),
});
const eip1559Fees = (client: PublicClient) => Effect.tryPromise({
  try: () => client.estimateFeesPerGas({ type: "eip1559", chain: undefined }),
  catch: (error) => rpcFault(error),
});

export const estimateFees = (client: PublicClient) => Effect.gen(function* () {
  const block = yield* Effect.tryPromise({
    try: () => client.getBlock({ blockTag: "latest" }),
    catch: (error) => rpcFault(error),
  });
  return block.baseFeePerGas == null
    ? { type: "legacy" as const, gasPrice: yield* legacyFees(client) }
    : { type: "eip1559" as const, ...yield* eip1559Fees(client) };
});

const bump = (fee: bigint) => fee + (fee / 8n || 1n);
const max = (left: bigint, right: bigint) => left > right ? left : right;
const capExceeded = () => new ChainFault({ kind: "funds", message: "The fee cap is lower than the replacement fee" });

/** Replacement candidates use a 12.5% increase (at least 1 wei), bounded by the caller's fee cap. */
export const replacementTransaction = (client: PublicClient, original: Transaction, cap: bigint) =>
  Effect.gen(function* () {
    if (original.type === "legacy") {
      const gasPrice = max(bump(original.gasPrice), yield* legacyFees(client));
      if (gasPrice > cap) return yield* capExceeded();
      return { ...original, gasPrice };
    }
    const estimate = yield* eip1559Fees(client);
    const maxPriorityFeePerGas = max(bump(original.maxPriorityFeePerGas), estimate.maxPriorityFeePerGas);
    const maxFeePerGas = max(max(bump(original.maxFeePerGas), estimate.maxFeePerGas), maxPriorityFeePerGas);
    if (maxFeePerGas > cap) return yield* capExceeded();
    return { ...original, maxFeePerGas, maxPriorityFeePerGas };
  });
