// Adapted from @prb/effect-evm@5.0.3 src/nonce/manager.ts. See LICENSE-prb-effect-evm.
import { Effect, Ref } from "effect";
import type { Address } from "viem";
import { ChainFault } from "../../faults/types.ts";
import type { Broadcast, NonceReservation } from "../types.ts";

type Pending = {
  readonly reservation: NonceReservation;
  readonly broadcast?: Broadcast;
};

type AccountNonces = ReadonlyMap<number, Pending>;
const keyOf = (address: Address) => address.toLowerCase();

export const makeNonceManager = Effect.gen(function* () {
  // One instance belongs to one chain. The case-folded sender separates its nonce lanes.
  const state = yield* Ref.make(new Map<string, AccountNonces>());

  const update = (address: Address, applied: AccountNonces) => (all: ReadonlyMap<string, AccountNonces>) => {
    const next = new Map(all);
    if (applied.size === 0) next.delete(keyOf(address));
    else next.set(keyOf(address), applied);
    return next;
  };

  const reserveNext = (address: Address, startNonce: number) =>
    Ref.modify(state, (all) => {
      const pending = new Map(all.get(keyOf(address)));
      let nonce = startNonce;
      while (pending.has(nonce)) nonce += 1;
      const reservation = Object.freeze({ address, nonce });
      pending.set(nonce, { reservation });
      return [reservation, update(address, pending)(all)];
    });

  const release = (reservation: NonceReservation) =>
    Ref.update(state, (all) => {
      const { address, nonce } = reservation;
      const pending = new Map(all.get(keyOf(address)));
      const entry = pending.get(nonce);
      if (entry?.reservation !== reservation || entry.broadcast !== undefined) return all;
      pending.delete(nonce);
      return update(address, pending)(all);
    });

  const beginBroadcast = (reservation: NonceReservation, broadcast: Broadcast) =>
    Ref.modify(state, (all): readonly [Broadcast | undefined, Map<string, AccountNonces>] => {
      const { address, nonce } = reservation;
      const pending = new Map(all.get(keyOf(address)));
      const entry = pending.get(nonce);
      if (entry?.reservation !== reservation) return [undefined, all];
      if (entry.broadcast?.hash === broadcast.hash) return [entry.broadcast, all];
      if (entry.broadcast?.hash !== broadcast.replaces) return [undefined, all];
      const next = { ...broadcast, fromBlock: entry.broadcast?.fromBlock ?? broadcast.fromBlock };
      pending.set(nonce, { reservation, broadcast: next });
      return [next, update(address, pending)(all)];
    }).pipe(
      Effect.flatMap((broadcast) => broadcast === undefined
        ? Effect.fail(new ChainFault({ kind: "nonce", message: "The nonce is no longer reserved for this transaction" }))
        : Effect.succeed(broadcast)),
    );

  const pruneFinalized = (address: Address, nextNonce: number) =>
    Ref.update(state, (all) => {
      const pending = new Map(all.get(keyOf(address)));
      for (const [nonce, entry] of pending) {
        if (entry.broadcast !== undefined && nonce < nextNonce) pending.delete(nonce);
      }
      return update(address, pending)(all);
    });

  return { reserveNext, release, beginBroadcast, pruneFinalized };
});
