import { Effect } from "effect";
import { expect, test } from "vitest";
import { makeNonceManager } from "./internal/manager.ts";

const sender = "0x000000000000000000000000000000000000000a";
const firstHash = "0x0000000000000000000000000000000000000000000000000000000000000001";
const nextHash = "0x0000000000000000000000000000000000000000000000000000000000000002";

test("allocates unique nonces across parallel calls and case variants", () => Effect.runPromise(Effect.gen(function* () {
  const manager = yield* makeNonceManager;
  const reservations = yield* Effect.forEach(Array.from({ length: 100 }, (_, i) => i), (i) =>
    manager.reserveNext(i % 2 === 0 ? sender : "0x000000000000000000000000000000000000000A", 9),
  { concurrency: "unbounded" });
  expect(reservations.map(({ nonce }) => nonce).sort((a, b) => a - b))
    .toEqual(Array.from({ length: 100 }, (_, i) => i + 9));
})));

test("does not recycle a broadcast nonce or let an obsolete reservation release its successor", () =>
  Effect.runPromise(Effect.gen(function* () {
    const manager = yield* makeNonceManager;
    const cancelled = yield* manager.reserveNext(sender, 0);
    yield* manager.release(cancelled);
    const tx = yield* manager.reserveNext(sender, 0);
    yield* manager.release(cancelled);
    const first = { hash: firstHash, fromBlock: 1n } as const;
    yield* manager.beginBroadcast(tx, first);
    expect(yield* manager.beginBroadcast(tx, { ...first, fromBlock: 2n })).toEqual(first);
    yield* manager.release(tx);
    expect((yield* manager.reserveNext(sender, 0)).nonce).toBe(1);
    const replacement = { hash: nextHash, fromBlock: 2n, replaces: firstHash } as const;
    expect(yield* manager.beginBroadcast(tx, replacement)).toEqual({ ...replacement, fromBlock: 1n });
    expect(yield* manager.beginBroadcast(tx, first).pipe(Effect.flip)).toMatchObject({ kind: "nonce" });
  })));
