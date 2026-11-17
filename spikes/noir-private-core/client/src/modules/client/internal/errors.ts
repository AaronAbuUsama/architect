import { AllowanceExceeded, AllowanceNotAdmin, AllowanceNotMember, AztecFailure, NetworkRejected, type OpError, type Step } from "../types.js";

// Raw errors remain on the device and are never attached to an Effect failure.
export function classify(step: Step, error: unknown): OpError {
  const message = error instanceof Error ? error.message : String(error);
  const remaining = /\[PC-010\] AllowanceExceeded \{ remaining: (\d+) \}/.exec(message)?.[1];
  if (remaining !== undefined) return new AllowanceExceeded({ remaining: BigInt(remaining) });
  if (message.includes("[PC-020] AllowanceNotAdmin")) return new AllowanceNotAdmin();
  if (message.includes("[PC-021] AllowanceNotMember")) return new AllowanceNotMember();
  if (step === "submit" || step === "wait") {
    if (/nullifier conflict with existing tx/i.test(message)) return new NetworkRejected({ reason: "Nullifier conflict" });
    if (/existing nullifier/i.test(message)) return new NetworkRejected({ reason: "Existing nullifier" });
    if (/expiration/i.test(message)) return new NetworkRejected({ reason: "Invalid expiration timestamp" });
    if (/dropped/i.test(message)) return new NetworkRejected({ reason: "dropped" });
  }
  return new AztecFailure({ step });
}
