import { Timers } from "@orthograph/language-effect";
import { Effect, Stream } from "effect";
import { TestClock } from "effect/testing";
import { createPublicClient, custom, parseAbi } from "viem";
import { expect, test } from "vitest";
import type { DecodedEvent, EventFollower, EventPoll } from "../events/types.ts";
import { makeEventSource } from "../events/service.ts";
import { trackTransaction } from "./internal/tracker.ts";
import type { Rpc } from "./internal/rpc.ts";
import type { Intent, Submission } from "./types.ts";

const client = createPublicClient({ transport: custom({ request: () => Promise.resolve(null) }, { retryCount: 0 }) });
const rpc: Rpc = (read) => Effect.tryPromise({ try: () => read(client), catch: (error) => error });
const timers = Timers.of({
  at: () => Effect.die("Tracker unit tests only use sleeps"),
  sleep: () => Effect.void,
  due: () => Effect.succeed(undefined),
  fire: () => Effect.succeed([]),
  pending: Effect.succeed([]),
});
const submission: Submission = {
  hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  from: "0x0000000000000000000000000000000000000001", nonce: 0, fromBlock: 0n,
};
const source = makeEventSource(parseAbi(["event Sent(uint256 value)"])[0], submission.from, 0n);
const event: DecodedEvent = {
  address: submission.from, args: { value: 1n }, blockNumber: 0n, blockHash: submission.hash,
  eventName: "Sent", transactionHash: submission.hash, logIndex: 0,
};
const empty: EventPoll<DecodedEvent> = {
  checkpoint: { through: undefined, window: [], seen: [] },
  caughtUp: true, headTimestamp: 10n, changes: [],
};

const track = (intent: Intent, poll: EventFollower<DecodedEvent>["poll"]) =>
  trackTransaction(rpc, timers, { chainId: 1, rpcUrl: "http://unused.invalid" }, 1, 1_000, () => Effect.succeed(0),
    submission, intent, { poll, stream: () => Stream.empty });

test("a late confirmation remains valid when the checkpoint has already pruned the event", () => {
  let polls = 0;
  const intent = { source, matches: () => true };
  const result = track(intent, () => Effect.gen(function* () {
    if (polls++ === 0) {
      yield* TestClock.adjust("2 seconds");
      return { ...empty, changes: [{ _tag: "Confirmed", event }] };
    }
    return { ...empty, changes: [{ _tag: "Corrected", event, wasConfirmed: true }] };
  }));
  return Effect.runPromise(result.pipe(Stream.take(2), Stream.runCollect, Effect.provide(TestClock.layer()))).then((changes) => {
    expect(changes.map(({ _tag }) => _tag)).toEqual(["Confirmed", "Corrected"]);
  });
});

test("the on-chain intent deadline drops an intent that has no matching event", () =>
  Effect.runPromise(track({ source, matches: () => true, deadline: 9n }, () => Effect.succeed(empty)).pipe(Stream.runCollect))
    .then((changes) => expect(changes).toMatchObject([{ _tag: "Dropped", reason: "deadline", hash: submission.hash }])));
