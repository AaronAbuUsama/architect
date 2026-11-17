import { Effect } from "effect";
import { strict as assert } from "node:assert";
import type { ClockControls, Harness } from "../types.js";

function latest(h: ClockControls) {
  return Effect.promise(() => h.node.getBlockData("latest")).pipe(Effect.map((b) => Number(b!.header.globalVariables.timestamp)));
}

export function advance(h: ClockControls, target: number, settle = true) {
  return Effect.gen(function* () {
    let now = yield* latest(h);
    let steps = 0;
    while (now < target) {
      const l1 = yield* Effect.promise(() => h.eth.nextBlockTimestamp());
      // Settlement can move L1 beyond the latest L2 timestamp. Never warp L1
      // backwards; a fresh tick catches L2 up instead. Keep a full hour of slack.
      const next = Math.min(Math.max(now, l1) + 22 * 3600, target);
      if (next >= l1) yield* Effect.promise(() => h.eth.warp(next));
      yield* h.tick();
      if (settle) {
        const block = yield* Effect.promise(() => h.node.getBlockNumber());
        for (let n = 0; n < 20; n++) {
          if ((yield* Effect.promise(() => h.node.getChainTips())).finalized.block.number >= block) break;
          yield* Effect.promise(() => h.eth.rpcCall("anvil_mine", [130, 0]));
          yield* h.wait(1000);
        }
        assert.ok((yield* Effect.promise(() => h.node.getChainTips())).finalized.block.number >= block, "warp finality caught up");
      }
      now = yield* latest(h);
      steps++;
    }
    return steps;
  });
}

export function clock(h: Harness, nextMonth: number) {
  return Effect.gen(function* () {
    const steps = yield* advance(h, nextMonth - 4 * 3600);
    // Finality is caught up before approaching the boundary. Settling epochs
    // at midnight would itself move the controlled clock through the test.
    yield* advance(h, nextMonth - 1800, false);
    const before = yield* h.read(h.member);
    const held = yield* h.prove(h.member, "spend", h.core(h.member).methods.spend(h.recipient.address, 211n));
    const proofCompletedL1Timestamp = yield* Effect.promise(() => h.eth.lastBlockTimestamp());
    assert.ok(proofCompletedL1Timestamp < nextMonth, "proof completed before midnight on L1");
    const ordinary = yield* h.ordinary();
    assert.equal(held.anchor, ordinary.anchor, "same anchor for ordinary control");
    assert.equal(held.expires - held.anchor, ordinary.expires - ordinary.anchor, "no month-specific lifetime");
    yield* advance(h, nextMonth + 120, false);
    const landed = yield* held.submit;
    const gossip = yield* Effect.promise(() => h.node.getTxByHash(landed.tx.getTxHash(), { includeProof: true }));
    assert.ok(gossip && gossip.toBuffer().equals(landed.tx.toBuffer()));
    const after = yield* h.read(h.member);
    const timestamp = Number((yield* Effect.promise(() => h.node.getBlockData(landed.receipt.blockNumber!)))!.header.globalVariables.timestamp);
    assert.ok(held.anchor < nextMonth && timestamp >= nextMonth, "proof and inclusion straddle UTC month");
    assert.equal(after[2], before[2] + 211n);
    assert.equal(after[3], before[3], "late proof still debits old month");
    yield* h.run(h.member, "spend", h.core(h.member).methods.spend(h.recipient.address, 307n));
    const reset = yield* h.read(h.member);
    assert.equal(reset[2], 307n);
    assert.equal(reset[3], before[3] + 1n);
    return { steps, anchor: held.anchor, ordinaryAnchor: ordinary.anchor, proofCompletedL1Timestamp, included: timestamp, oldMonthCharged: true, nextTouchResets: true, lifetimeSeconds: held.expires - held.anchor, ordinaryLifetimeSeconds: ordinary.expires - ordinary.anchor, expiration: held.expires, ordinaryExpiration: ordinary.expires, boundaryTransaction: { gossip, submittedBytes: landed.tx.toBuffer().toString("hex"), nodeReturnedSameTx: true } };
  });
}
