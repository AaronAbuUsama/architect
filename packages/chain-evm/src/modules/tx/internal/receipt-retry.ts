// Adapted from @prb/effect-evm@5.0.3 src/tx/internal/receipt-retry.ts. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Effect } from "effect";
import { isTransient } from "../../faults/internal/viem-mapper.ts";

/** Three transient RPC retries, with exponential backoff parked on the world's clock. */
export const retryRead = <A>(timers: typeof Timers.Service, read: Effect.Effect<A, unknown>, attempt = 0): Effect.Effect<A, unknown> =>
  Effect.catch(read, (error) => attempt < 3 && isTransient(error)
    ? timers.sleep("chain.evm", 1_000 * 2 ** attempt).pipe(Effect.andThen(retryRead(timers, read, attempt + 1)))
    : Effect.fail(error));
