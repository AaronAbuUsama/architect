import { Cause, Effect, Exit } from "effect";
import { ChainFault, ChainRefusal, type FaultKind } from "@orthograph/chain-evm/device";
import { describe, expect, it } from "vitest";
import { KeyLocked, SimulationReverted } from "../../../blueprint/things/wallet/errors.js";
import { refused } from "./internal/flow.ts";

const fault = (kind: FaultKind) => new ChainFault({ kind, message: "EVM RPC request failed" });

describe("what a fault of the chain is to the person sending", () => {
  it.each(["revert", "panic", "funds"] as const)("a %s fault in simulation is SimulationReverted", async (kind) => {
    expect(await Effect.runPromise(Effect.flip(refused(fault(kind))))).toBeInstanceOf(SimulationReverted);
  });

  it("a refusal the contract gave by name is SimulationReverted", async () => {
    const refusal = new ChainRefusal({ code: "TOKEN-001", name: "InsufficientBalance", selector: "0xcf479181", args: {} });
    expect(await Effect.runPromise(Effect.flip(refused(refusal)))).toBeInstanceOf(SimulationReverted);
  });

  it.each(["rejected", "signing"] as const)("a %s fault is KeyLocked: the signer would not sign", async (kind) => {
    expect(await Effect.runPromise(Effect.flip(refused(fault(kind))))).toBeInstanceOf(KeyLocked);
  });

  it.each(["transport", "timeout", "configuration", "nonce"] as const)("a %s fault is a defect that says what, not a declared error", async (kind) => {
    const exit = await Effect.runPromiseExit(refused(fault(kind)));
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    expect(Exit.isFailure(exit) && Cause.pretty(exit.cause)).toContain(kind);
  });
});
