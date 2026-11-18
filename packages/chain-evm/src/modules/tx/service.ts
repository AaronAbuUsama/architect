// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,policy}.ts. See LICENSE-prb-effect-evm.
import { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import { createPublicClient, http } from "viem";
import { makeFollower } from "../events/service.ts";
import { rpcFault, validateRefusalLock } from "../faults/service.ts";
import { ChainFault } from "../faults/types.ts";
import { makeTransactionManager } from "./internal/manager.ts";
import { trackTransaction } from "./internal/tracker.ts";
import type { ChainPort, ChainPortOptions } from "./types.ts";

export const makeChainPort = (options: ChainPortOptions): Effect.Effect<ChainPort, ChainFault, Timers> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const interval = options.pollIntervalMs ?? 4_000;
    const timeout = options.receiptTimeoutMs ?? 120_000;
    const url = URL.canParse(options.rpcUrl) ? new URL(options.rpcUrl) : undefined;
    const validNumber = (value: number) => Number.isSafeInteger(value) && value > 0;
    if ((url?.protocol !== "http:" && url?.protocol !== "https:") ||
        !validNumber(options.chainId) || !validNumber(interval) || !validNumber(timeout)) {
      return yield* new ChainFault({ kind: "configuration", message: "Invalid EVM RPC URL, chain ID or polling policy" });
    }
    yield* validateRefusalLock(options.refusals ?? []);
    // The manager owns retries and polling. viem's transport and actions are one-shot.
    const client = createPublicClient({ transport: http(options.rpcUrl, { retryCount: 0, timeout: 0 }), cacheTime: 0 });
    const chainId = yield* Effect.tryPromise({
      try: () => client.getChainId(),
      catch: (error) => rpcFault(error),
    });
    if (chainId !== options.chainId) {
      return yield* new ChainFault({ kind: "configuration", message: "EVM RPC chain ID does not match the port's chain ID" });
    }
    const manager = yield* makeTransactionManager(client, options);
    const follow: ChainPort["follow"] = (source, level) => makeFollower(client, timers, interval, source, level);
    const track: ChainPort["track"] = (submission, level, intent) => trackTransaction(
      client, timers, options, interval, timeout, manager.nonces.nonceAtHead, submission, intent,
      intent === undefined ? undefined : follow(intent.source, level),
    );
    const simulate: ChainPort["simulate"] = options.simulate ?? (() => Effect.fail(
      new ChainFault({ kind: "unsupported", message: "The EVM port has no simulator configured" }),
    ));
    return { prepare: manager.prepare, simulate, sign: manager.sign, submit: manager.submit, replace: manager.replace, track, follow, release: manager.release };
  });
