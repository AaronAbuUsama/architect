// Adapted from @prb/effect-evm@5.0.3 src/tx/manager.ts and tx/internal/receipt-retry.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { Hash, PublicClient, TransactionReceipt } from "viem";
import { isPendingReceipt } from "../../faults/internal/viem-mapper.ts";
import { decodeRevert, rpcFault } from "../../faults/service.ts";
import type { ChainPortOptions, Submission } from "../types.ts";
import { retryRead } from "./receipt-retry.ts";

export const readReceipt = (client: PublicClient, timers: typeof Timers.Service, hash: Hash) =>
  retryRead(timers, Effect.tryPromise({
    try: () => client.getTransactionReceipt({ hash }),
    catch: (error) => error,
  })).pipe(
    Effect.catch((error) => isPendingReceipt(error) ? Effect.succeed(undefined) : Effect.fail(rpcFault(error))),
  );

export const receiptSpan = (chainId: number, receipt: TransactionReceipt) =>
  Effect.void.pipe(Effect.withSpan("chain.evm.receipt", { attributes: {
    chainId,
    "transaction.hash": receipt.transactionHash,
    "transaction.status": receipt.status,
    "transaction.gasUsed": receipt.gasUsed.toString(),
    "transaction.effectiveGasPrice": receipt.effectiveGasPrice.toString(),
    "block.number": receipt.blockNumber.toString(),
    "block.hash": receipt.blockHash,
  } }));

export const receiptError = (options: ChainPortOptions, submission: Submission, hash: Hash) =>
  (options.traceRevert?.(hash).pipe(Effect.catch(() => Effect.succeed(undefined))) ?? Effect.succeed(undefined)).pipe(
    Effect.flatMap((data) => decodeRevert(data, submission.to, options.refusals)),
    Effect.flip,
  );
