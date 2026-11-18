// Adapted from @prb/effect-evm@5.0.3 src/tx/{manager,tracker}.ts and K7 Q3. See LICENSE-prb-effect-evm.
import type { Timers } from "@orthograph/language-effect";
import { Clock, Effect, Stream } from "effect";
import type { Hash, PublicClient, TransactionReceipt } from "viem";
import type { DecodedEvent, EventCheckpoint, EventFollower } from "../../events/types.ts";
import { ChainFault } from "../../faults/types.ts";
import type { ChainPortOptions, Intent, Submission, TxState } from "../types.ts";
import { readReceipt, receiptError, receiptSpan } from "./receipt.ts";
import { findReplacement } from "./replacement.ts";

interface Tracking<TEvent extends DecodedEvent> {
  readonly deadline: number;
  readonly wait: boolean;
  readonly done: boolean;
  readonly timedOut: boolean;
  readonly confirmed: boolean;
  readonly checkpoint: EventCheckpoint<TEvent> | undefined;
  readonly receipt: TransactionReceipt | undefined;
  readonly replacement: Hash | undefined;
  readonly dropped: boolean;
}

export const trackTransaction = <TEvent extends DecodedEvent>(
  client: PublicClient,
  timers: typeof Timers.Service,
  options: ChainPortOptions,
  interval: number,
  timeout: number,
  nonceAtHead: (address: Submission["from"]) => Effect.Effect<number, ChainFault>,
  submission: Submission,
  intent: Intent<TEvent> | undefined,
  follower: EventFollower<TEvent> | undefined,
): Stream.Stream<TxState<TEvent>, ChainFault> =>
  Stream.unwrap(Effect.gen(function* () {
    const start = yield* Clock.currentTimeMillis;
    const initial: Tracking<TEvent> = {
      deadline: start + timeout, wait: false, done: false, timedOut: false, confirmed: false,
      checkpoint: undefined, receipt: undefined, replacement: undefined, dropped: false,
    };
    return Stream.unfold(initial, (previous) => Effect.gen(function* () {
      if (previous.done) return undefined;
      if (previous.timedOut) {
        return yield* new ChainFault({ kind: "timeout", message: "The EVM tracking deadline elapsed before observing the requested outcome" });
      }
      if (previous.wait) yield* timers.sleep("chain.evm.receipt", interval);
      const states: TxState<TEvent>[] = [];
      const now = yield* Clock.currentTimeMillis;
      const included = yield* readReceipt(client, timers, submission.hash);
      const replacement = included === undefined && (yield* nonceAtHead(submission.from)) > submission.nonce
        ? yield* findReplacement(client, timers, submission)
        : undefined;
      if (replacement?.sameCall && replacement.hash !== previous.replacement) {
        states.push({ _tag: "Replaced", oldHash: submission.hash, newHash: replacement.hash });
      }
      const receipt = replacement?.sameCall
        ? yield* readReceipt(client, timers, replacement.hash)
        : included;
      if (receipt !== undefined && (receipt.transactionHash !== previous.receipt?.transactionHash ||
          receipt.blockHash !== previous.receipt.blockHash)) {
        yield* receiptSpan(options.chainId, receipt);
        states.push({ _tag: "Included", receipt });
        if (receipt.status === "reverted") {
          states.push({ _tag: "Reverted", receipt, error: yield* receiptError(options, submission, receipt.transactionHash) });
        }
      }
      const dropped = replacement !== undefined && !replacement.sameCall;
      if (dropped && !previous.dropped) states.push({ _tag: "Dropped", hash: submission.hash, reason: "nonce-consumed" });

      let checkpoint = previous.checkpoint;
      let confirmed = previous.confirmed;
      let deadline = previous.deadline;
      let wait = true;
      if (follower !== undefined && intent !== undefined) {
        const page = yield* follower.poll(checkpoint);
        checkpoint = page.checkpoint;
        wait = page.caughtUp;
        for (const change of page.changes) {
          if (change._tag === "Observed" || !intent.matches(change.event)) continue;
          states.push(change);
        }
        confirmed = page.checkpoint.seen.some(({ event, confirmed: isConfirmed }) => isConfirmed && intent.matches(event)) ||
          (confirmed && !states.some((state) => state._tag === "Corrected" && state.wasConfirmed));
        if (previous.confirmed && !confirmed) deadline = now + timeout;
      }
      const done = intent === undefined && (receipt !== undefined || dropped);
      const timedOut = (yield* Clock.currentTimeMillis) >= deadline && !confirmed && !done && wait;
      return [states, {
        deadline, done, timedOut, wait, confirmed, checkpoint, receipt,
        replacement: replacement?.sameCall ? replacement.hash : undefined, dropped,
      }] as const;
    })).pipe(Stream.flatMap((states) => Stream.fromIterable(states)));
  }));
