import { Effect, Layer } from "effect";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee";
import { waitForTx } from "@aztec/aztec.js/node";
import { Client, Device, NetworkRejected, type ClassifyFailure, type ClientShape, type DeviceConfig, type Interaction, type OpError, type Proven, type Step } from "./types.js";
import { classify } from "./internal/errors.js";
export { DeviceWallet } from "./internal/wallet.js";
// The raw RPC probes use the same public error boundary as client operations.
export const classifyFailure: ClassifyFailure = classify;

function step<A>(name: Step, task: () => Promise<A>) {
  return Effect.tryPromise({ try: task, catch: (error) => classify(name, error) }).pipe(
    Effect.withSpan(name, { attributes: { "architect.step": name } }),
  );
}

function operation<A>(name: string, effect: Effect.Effect<A, OpError>) {
  return effect.pipe(
    Effect.tapError((error) => Effect.annotateCurrentSpan("architect.outcome", error._tag)),
    Effect.tap(() => Effect.annotateCurrentSpan("architect.outcome", "ok")),
    Effect.withSpan(`private-core.${name}`, { attributes: { "architect.operation": name, "architect.runs": "client" } }),
  );
}

function prove(d: DeviceConfig, interaction: Interaction): Effect.Effect<Proven, OpError> {
  return Effect.gen(function* () {
    const started = performance.now();
    const fee = { paymentMethod: new SponsoredFeePaymentMethod(d.sponsor) };
    const request = yield* Effect.gen(function* () {
      const payload = yield* Effect.tryPromise({ try: () => interaction.request({ fee }), catch: (e) => classify("request", e) });
      const fees = yield* Effect.tryPromise({ try: () => d.wallet.fee(payload, d.from), catch: (e) => classify("request", e) });
      return yield* Effect.tryPromise({ try: () => d.wallet.execution(payload, d.from, fees), catch: (e) => classify("request", e) });
    }).pipe(Effect.withSpan("request", { attributes: { "architect.step": "request" } }));
    yield* step("sync", () => d.wallet.engine.sync());
    const beginProof = performance.now();
    const proven = yield* step("prove", () => d.wallet.engine.proveTx(request, {
      scopes: d.wallet.scope(d.from, d.pool), senderForTags: d.pool,
    }));
    const timings = { provingMs: proven.stats?.timings.proving ?? -1, proveMs: performance.now() - beginProof, totalMs: 0 };
    const tx = yield* Effect.tryPromise({ try: () => proven.toTx(), catch: (e) => classify("prove", e) });
    const anchor = Number(proven.publicInputs.constants.anchorBlockHeader.globalVariables.timestamp);
    const expires = Number(proven.publicInputs.expirationTimestamp);
    const submit = Effect.gen(function* () {
      yield* step("submit", () => d.node.sendTx(tx));
      const receipt = yield* step("wait", () => waitForTx(d.node, tx.getTxHash(), { interval: 0.25, timeout: 120 }));
      if (String(receipt.executionResult) !== "success") return yield* Effect.fail(new NetworkRejected({ reason: "reverted" }));
      timings.totalMs = performance.now() - started;
      return { tx, receipt, anchor, expires, timings };
    });
    return { tx, anchor, expires, timings, submit };
  });
}

function make(d: DeviceConfig): ClientShape {
  return {
    prove: (name, interaction) => operation(name, prove(d, interaction)),
    run: (name, interaction) => operation(name, Effect.gen(function* () {
      const result = yield* prove(d, interaction);
      return yield* result.submit;
    })),
  };
}

export const live = Layer.effect(Client, Effect.map(Device, make));
