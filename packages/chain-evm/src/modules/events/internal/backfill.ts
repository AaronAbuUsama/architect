// Adapted from @prb/effect-evm@5.0.3 src/events/backfill.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import type { PublicClient } from "viem";
import { rpcFault } from "../../faults/service.ts";
import { retryRead } from "../../tx/internal/receipt-retry.ts";
import type { DecodedEvent, EventSource } from "../types.ts";

export const readRange = <TEvent extends DecodedEvent>(
  client: PublicClient, timers: typeof Timers.Service, source: EventSource<TEvent>, fromBlock: bigint, toBlock: bigint,
) => retryRead(timers, Effect.tryPromise({
  try: () => client.getLogs({ address: source.address, event: source.event, fromBlock, toBlock }),
  catch: (error) => error,
})).pipe(
  Effect.mapError((error) => rpcFault(error, source.address)),
  Effect.flatMap((logs) => Effect.forEach(logs, source.decode)),
);
