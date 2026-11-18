import type { Busy, Timers } from "@orthograph/language-effect";
import { Clock, Context, Effect } from "effect";
import { createPublicClient, http, type PublicClient } from "viem";
import { ChainFault } from "../../faults/types.ts";

export type Rpc = <A>(read: (client: PublicClient) => Promise<A>) => Effect.Effect<A, unknown>;

export const RpcDeadline = Context.Reference("@orthograph/chain-evm/RpcDeadline", { defaultValue: () => Infinity });
export const rpcTimeout = () => new ChainFault({ kind: "timeout", message: "The EVM RPC request exceeded its deadline" });

export const makeRpc = (
  url: string, timers: typeof Timers.Service, busy: typeof Busy.Service | undefined, timeout: number,
): Rpc => (read) => Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  const deadline = yield* RpcDeadline;
  const remaining = Math.min(timeout, deadline - now);
  if (remaining <= 0) return yield* rpcTimeout();

  const request = Effect.tryPromise({
    try: (signal) => read(createPublicClient({
      transport: http(url, { retryCount: 0, timeout: 0, fetchOptions: { signal } }),
      cacheTime: 0,
    })),
    catch: (error) => error,
  });
  const sleep = timers.sleep("chain.evm.rpc", remaining);
  const expired = (busy === undefined ? sleep : busy.counted(sleep)).pipe(Effect.andThen(Effect.fail(rpcTimeout())));
  return yield* Effect.raceFirst(request, expired);
});
