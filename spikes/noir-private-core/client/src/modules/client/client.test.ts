import { strict as assert } from "node:assert";
import { Effect } from "effect";
import { classifyFailure as classify } from "./service.js";

export const checkRefusals = Effect.sync(() => {
  const error = classify("prove", new Error("Assertion failed: [PC-010] AllowanceExceeded { remaining: 5679 }"));
  assert.equal(error._tag, "AllowanceExceeded");
  assert.equal("remaining" in error ? error.remaining : undefined, 5679n);
  assert.equal(classify("submit", new Error("Invalid tx: Existing nullifier 0xPRIVATE"))._tag, "NetworkRejected");
  const pending = classify("submit", new Error("Nullifier conflict with existing tx 0xPRIVATE. Minimum required fee: 1, got: 0"));
  assert.equal(pending._tag, "NetworkRejected");
  assert.equal("reason" in pending ? pending.reason : undefined, "Nullifier conflict");
  assert.equal(JSON.stringify(pending).includes("0xPRIVATE"), false);
  assert.equal(JSON.stringify(classify("prove", new Error("unknown private payload"))).includes("private payload"), false);
});
