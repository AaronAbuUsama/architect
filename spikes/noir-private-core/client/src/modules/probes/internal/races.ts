import { Effect } from "effect";
import { strict as assert } from "node:assert";
import { waitForTx } from "@aztec/aztec.js/node";
import type { Harness } from "../types.js";
import { classifyFailure } from "~/modules/client/service.js";

// Pause the real sequencer and attempt both proven competitors. The normal
// admission path may reject the second before both reach the candidate block.
export function races(h: Harness) {
  return Effect.gen(function* () {
    const results: unknown[] = [];
    for (const [index, member] of h.raceMembers.entries()) {
      yield* h.run(h.admin, "grant", h.core(h.admin).methods.grant(member.address, 10000n));
      const spend = yield* h.prove(member, "spend", h.core(member).methods.spend(h.recipient.address, 101n));
      const revoke = yield* h.prove(h.admin, "revoke", h.core(h.admin).methods.revoke(member.address));
      const [first, second] = index === 0 ? [revoke, spend] : [spend, revoke];
      yield* Effect.promise(() => h.api.pauseSequencer());
      const admit = (tx: typeof spend.tx) => Effect.tryPromise({
        try: () => h.node.sendTx(tx),
        catch: (e) => ({ refusal: classifyFailure("submit", e), message: (e instanceof Error ? e.message : String(e)).replace(/0x[a-f0-9]+/gi, "[hash]") }),
      }).pipe(Effect.result);
      const firstAdmission = yield* admit(first.tx);
      const secondAdmission = yield* admit(second.tx);
      const pending = yield* Effect.promise(() => h.node.getPendingTxs());
      yield* Effect.promise(() => h.api.resumeSequencer());
      const receipt = (tx: typeof spend.tx) => Effect.tryPromise({
        try: () => waitForTx(h.node, tx.getTxHash(), { interval: 0.25, timeout: 30 }),
        catch: () => "dropped-or-timeout" as const,
      }).pipe(Effect.result);
      const a = yield* receipt(spend.tx);
      const b = yield* receipt(revoke.tx);
      const spendWon = a._tag === "Success" && String(a.success.executionResult) === "success";
      const revokeWon = b._tag === "Success" && String(b.success.executionResult) === "success";
      assert.equal(Number(spendWon) + Number(revokeWon), 1, "exactly one same-note competitor must commit");
      const loserTx = spendWon ? revoke.tx : spend.tx;
      const loserReceipt = yield* Effect.promise(() => h.node.getTxReceipt(loserTx.getTxHash()));
      if (secondAdmission._tag === "Failure") {
        assert.equal(secondAdmission.failure.refusal._tag, "NetworkRejected");
        assert.match(secondAdmission.failure.message, /nullifier/i);
      }
      else assert.equal(loserReceipt.status, "dropped", "a timeout is not evidence of rejection");
      let recovery = "unneeded";
      if (spendWon) {
        yield* h.run(h.admin, "revoke", h.core(h.admin).methods.revoke(member.address));
        recovery = "reproved revoke committed";
      }
      assert.equal((yield* h.read(member))[0], false);
      results.push({ submissionOrder: index === 0 ? "revoke,spend" : "spend,revoke", firstAdmission: firstAdmission._tag, secondAdmission: secondAdmission._tag, admissionError: secondAdmission._tag === "Failure" ? secondAdmission.failure.message : null, loserStatus: loserReceipt.status, loserError: loserReceipt.error, bothPending: pending.some((p) => p.getTxHash().equals(spend.tx.getTxHash())) && pending.some((p) => p.getTxHash().equals(revoke.tx.getTxHash())), spend: spendWon ? "mined" : "rejected", revoke: revokeWon ? "mined" : "rejected", winningBlock: spendWon && a._tag === "Success" ? a.success.blockNumber : b._tag === "Success" ? b.success.blockNumber : undefined, recovery });
    }
    return results;
  });
}
